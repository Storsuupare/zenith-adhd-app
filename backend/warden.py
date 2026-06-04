import os
import time
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
}

# Kinetic Mode: tasks are only reaped if still ACTIVE this many minutes past
# their deadline (user never completed or aborted — true abandonment).
MAX_BUFFER_MINUTES = int(os.getenv("MAX_BUFFER_MINUTES", 120))


def run_reaper_check() -> None:
    """
    Reaps ACTIVE tasks that have been running more than MAX_BUFFER_MINUTES
    past their deadline — meaning the user never completed or aborted.

    Kinetic Mode allows tab-switching freely; strikes are only applied when
    a task is truly abandoned (deadline + buffer exceeded).

    For each abandoned task:
      - Task → FAILED
      - User strikes +1 (soft counter, no lockout)
    """
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT t.id, t.user_id
                FROM tasks t
                WHERE t.status = 'ACTIVE'
                  AND t.deadline IS NOT NULL
                  AND t.deadline < NOW() - (%s * INTERVAL '1 minute')
                """,
                (MAX_BUFFER_MINUTES,),
            )
            abandoned = cur.fetchall()

            for task_id, user_id in abandoned:
                cur.execute(
                    "UPDATE tasks SET status = 'FAILED' WHERE id = %s",
                    (task_id,),
                )
                cur.execute(
                    "UPDATE users SET strikes = strikes + 1 WHERE id = %s",
                    (user_id,),
                )
                print(
                    f"REAPER: Task {task_id} abandoned | User {user_id} | strike recorded"
                )

            if abandoned:
                conn.commit()

    except Exception as exc:
        print(f"REAPER ERROR: {exc}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()


def start() -> None:
    print(f"ZENITH WARDEN ONLINE — DB: {DB_CONFIG['dbname']}")
    print(f"Reaper config: max buffer={MAX_BUFFER_MINUTES}m, no lockout penalty")
    while True:
        run_reaper_check()
        time.sleep(30)


if __name__ == "__main__":
    start()
