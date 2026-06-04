from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

def execute_mission_start(conn, user_id: str, duration: int) -> dict:
    """
    Atomically validates pre-flight gates and starts a mission.

    Gate 1 — Concurrency check: blocks if an ACTIVE task already exists.

    A single FOR UPDATE row-lock on the user prevents race conditions
    where two concurrent starts both pass the concurrency gate.
    Returns a result dict. Never raises.
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM users WHERE id = %s FOR UPDATE",
                (user_id,),
            )
            user_row = cur.fetchone()
            if not user_row:
                return {"success": False, "error": "USER_NOT_FOUND"}

            # Gate 1: no concurrent sessions
            cur.execute(
                "SELECT id FROM tasks WHERE user_id = %s AND status = 'ACTIVE' LIMIT 1",
                (user_id,),
            )
            if cur.fetchone():
                return {
                    "success": False,
                    "error": "ACTIVE_SESSION_EXISTS",
                    "detail": "Neural link already established. Finish your current mission first.",
                }

            # last_ping initialized to NOW() so the reaper clock starts immediately
            cur.execute(
                """
                INSERT INTO tasks (
                    user_id, duration_minutes, stake_amount,
                    status, created_at, last_ping
                )
                VALUES (%s, %s, 0, 'ACTIVE', NOW(), NOW())
                RETURNING id
                """,
                (user_id, duration),
            )
            task_id = cur.fetchone()[0]
            conn.commit()

            return {
                "success": True,
                "task_id": task_id,
            }

    except Exception as exc:
        conn.rollback()
        return {"success": False, "error": str(exc)}
