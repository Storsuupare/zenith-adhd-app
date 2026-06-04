from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from Security import execute_mission_start
from database import get_db_connection
import datetime

router = APIRouter()


class MissionStartRequest(BaseModel):
    user_id: str
    duration: int


@router.post("/start")
async def start_new_mission(req: MissionStartRequest):
    conn = get_db_connection()
    try:
        result = execute_mission_start(conn, req.user_id, req.duration)

        if not result["success"]:
            if result["error"] == "PENALTY ACTIVE":
                raise HTTPException(
                    status_code=403,
                    detail=f"Penalty Box: You are locked out for {result['minutes_left']} more minutes.",
                )
            if result["error"] == "ACTIVE_SESSION_EXISTS":
                raise HTTPException(status_code=409, detail=result["detail"])
            raise HTTPException(status_code=500, detail=result["error"])

        return {
            "status":  "active",
            "task_id": result["task_id"],
        }

    finally:
        conn.close()


@router.post("/{task_id}/ping")
async def task_ping(task_id: int, user_id: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE tasks
                SET last_ping = NOW()
                WHERE id = %s AND user_id = %s AND status = 'ACTIVE'
                RETURNING last_ping
                """,
                (task_id, user_id),
            )
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=410, detail="Task session expired or terminated!")
            conn.commit()
            return {"status": "synchronized", "last_ping": result[0]}

    finally:
        conn.close()


@router.post("/{task_id}/complete")
async def complete_task(task_id: int, user_id: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT created_at, duration_minutes, status
                FROM tasks
                WHERE id = %s AND user_id = %s
                """,
                (task_id, user_id),
            )
            task = cur.fetchone()
            if not task:
                raise HTTPException(status_code=404, detail="Task not found.")

            created_at, duration_minutes, status = task
            if status != "ACTIVE":
                raise HTTPException(status_code=400, detail="TASK_ALREADY_RESOLVED")
            now = datetime.datetime.now(datetime.timezone.utc)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=datetime.timezone.utc)

            minutes_passed = (now - created_at).total_seconds() / 60
            if minutes_passed < duration_minutes:
                raise HTTPException(
                    status_code=403,
                    detail=f"Mission incomplete. {int(duration_minutes - minutes_passed)} mins remaining.",
                )

            cur.execute(
                "UPDATE tasks SET status = 'SUCCESS', completed_at = NOW() WHERE id = %s",
                (task_id,),
            )
            conn.commit()
            return {"status": "success"}

    finally:
        conn.close()


class AbortRequest(BaseModel):
    user_id: str  # Clerk external_id (clerkUser.id from the frontend)


@router.post("/{task_id}/abort")
async def abort_task(task_id: int, req: AbortRequest):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Resolve Clerk external_id → internal users.id
            cur.execute(
                "SELECT id FROM users WHERE external_id = %s",
                (req.user_id,),
            )
            user_row = cur.fetchone()
            if not user_row:
                raise HTTPException(status_code=404, detail="User not found.")
            internal_user_id = user_row[0]

            # tasks.user_id is stored as VARCHAR, so compare with stringified id
            cur.execute(
                """
                UPDATE tasks
                SET status = 'FAILED'
                WHERE id = %s
                  AND user_id = %s
                  AND status = 'ACTIVE'
                RETURNING user_id
                """,
                (task_id, str(internal_user_id)),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="No active task found to cancel!")

            cur.execute(
                "UPDATE users SET strikes = strikes + 1 WHERE id = %s",
                (internal_user_id,),
            )

            conn.commit()
            return {"message": "Task Aborted!"}

    finally:
        conn.close()
