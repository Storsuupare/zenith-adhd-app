import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from database import get_db_connection

router = APIRouter()

BASE_REWARD_PER_MINUTE  = int(os.getenv("BASE_REWARD_PER_MINUTE", 2))
GRACE_PERIOD_SECONDS    = 60
PENALTY_LOCKOUT_MINUTES = int(os.getenv("REAPER_PENALTY_MINUTES", 15))


class TaskActionRequest(BaseModel):
    user_id: str   # Clerk external_id
    task_id: int


def _fetch_active_task(cursor, task_id: int, user_id: str):
    """
    Returns a single row for an ACTIVE task owned by this user, or None.
    """
    cursor.execute(
        """
        SELECT
            t.id,
            t.status,
            t.duration_minutes,
            t.created_at,
            u.id                               AS internal_user_id,
            COALESCE(u.strikes, 0)             AS strikes
        FROM tasks t
        JOIN users u ON t.user_id = u.id::text
        WHERE t.id = %s AND u.external_id = %s
        """,
        (task_id, user_id),
    )
    return cursor.fetchone()


# ── Success Route ─────────────────────────────────────────────────────────────

@router.post("/complete", status_code=200)
async def complete_task(req: TaskActionRequest):
    """
    Marks a task SUCCESS.
    """
    conn = get_db_connection()
    cur  = conn.cursor()
    try:
        row = _fetch_active_task(cur, req.task_id, req.user_id)
        if not row:
            raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")

        (task_id, status, _, _, _, _) = row

        if status != "ACTIVE":
            raise HTTPException(status_code=400, detail="TASK_ALREADY_RESOLVED")

        cur.execute("BEGIN")
        cur.execute(
            "UPDATE tasks SET status = 'SUCCESS', completed_at = NOW() WHERE id = %s",
            (task_id,),
        )
        conn.commit()

        return {"success": True}

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ── Failure Route ─────────────────────────────────────────────────────────────

@router.post("/fail", status_code=200)
async def fail_task(req: TaskActionRequest):
    """
    Marks a task FAILED.

    Grace period (within 60 s of creation):
        Attempt is logged (task → FAILED). No strike or lockout applied.

    After grace period:
        Strikes +1. 15-minute penalty lockout applied.
    """
    conn = get_db_connection()
    cur  = conn.cursor()
    try:
        row = _fetch_active_task(cur, req.task_id, req.user_id)
        if not row:
            raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")

        (task_id, status, duration_minutes,
         created_at, internal_user_id, strikes) = row

        if status != "ACTIVE":
            raise HTTPException(status_code=400, detail="TASK_ALREADY_RESOLVED")

        now = datetime.now(timezone.utc)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        elapsed_seconds = (now - created_at).total_seconds()
        in_grace        = elapsed_seconds <= GRACE_PERIOD_SECONDS

        cur.execute("BEGIN")
        cur.execute(
            "UPDATE tasks SET status = 'FAILED' WHERE id = %s",
            (task_id,),
        )

        if in_grace:
            conn.commit()
            return {
                "success":      True,
                "grace_period": True,
                "message":      "Grace period — attempt logged, no penalty.",
            }

        else:
            new_strikes   = int(strikes) + 1
            penalty_until = now + timedelta(minutes=PENALTY_LOCKOUT_MINUTES)
            cur.execute(
                """
                UPDATE users
                SET strikes = %s, penalty_until = %s
                WHERE id = %s
                """,
                (new_strikes, penalty_until, internal_user_id),
            )
            conn.commit()
            return {
                "success":      True,
                "grace_period": False,
                "strikes":      new_strikes,
                "locked_until": penalty_until.isoformat(),
                "message":      f"Stake seized. {PENALTY_LOCKOUT_MINUTES}-min lockout applied.",
            }

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
