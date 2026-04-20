from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import psycopg2
from datetime import datetime

app = FastAPI()

def get_db_connection():
    return psycopg2.connect(
        dbname="zenith_io_db",
        user="postgres",
        password="Katlamac123?",
        host="127.0.0.1",
        port="5432"
    )

class TaskCompletion(BaseModel):
    user_id: int
    skill_name: str
    duration_minutes: int
    status: str

@app.post("/complete-task")
async def complete_task(task: TaskCompletion):
    if task.status != 'SUCCESS':
        return {"message": "No progress recorded for failed sessions!"}

    # 1. THE LEGENDARY TIER MULTIPLIER
    m = task.duration_minutes
    if m >= 120:   multiplier = 150 # 18,000 XP
    elif m >= 90:  multiplier = 120 # 10,800 XP
    elif m >= 60:  multiplier = 100 # 6,000 XP
    elif m >= 30:  multiplier = 50  # 1,500 XP
    elif m >= 15:  multiplier = 30  # 450 XP
    else:          multiplier = 20  # 100 XP

    xp_gained = m * multiplier
    
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT xp, level, next_level_xp FROM skills WHERE user_id = %s AND name = %s;", 
                    (task.user_id, task.skill_name))
        result = cur.fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Skill not found")

        current_xp, current_level, next_level_xp = result
        new_xp = current_xp + xp_gained
        new_level = current_level
        new_next_level_xp = next_level_xp

        # The Level-Up Loop handles the massive XP dump from 120min sessions
        while new_xp >= new_next_level_xp:
            new_xp -= new_next_level_xp
            new_level += 1
            new_next_level_xp = int(new_next_level_xp * 1.5)

        cur.execute("""
            UPDATE skills SET xp = %s, level = %s, next_level_xp = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND name = %s;
        """, (new_xp, new_level, new_next_level_xp, task.user_id, task.skill_name))

        cur.execute("""
            INSERT INTO activity_log (user_id, title, duration_minutes, status, xp_gained)
            VALUES (%s, %s, %s, %s, %s);
        """, (task.user_id, f"LEGENDARY FOCUS: {task.skill_name}", m, task.status, xp_gained))

        conn.commit()
        return {"status": "SUCCESS", "xp_earned": xp_gained, "new_level": new_level}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)