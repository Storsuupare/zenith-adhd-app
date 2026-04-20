import os
import time
import psycopg2
from datetime import datetime, timezone 
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "dbname": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT")
}

def audit_focus():
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # THE RUTHLESS QUERY
        # We compare the deadline to the DB's CURRENT_TIMESTAMP.
        # We add a 2-second 'Grace Period' to prevent 'Instant Death' bugs.
        cur.execute("""
            SELECT id, user_id, stake_amount 
            FROM contracts 
            WHERE status = 'ACTIVE' 
            AND deadline < (NOW() AT TIME ZONE 'UTC' - INTERVAL  '5 seconds')
        """)
        
        lapsed = cur.fetchall()

        if lapsed:
            for row in lapsed:
                s_id, u_id, stake = row
                
                # 1. Update Contract Status
                cur.execute("UPDATE contracts SET status = 'FAILED' WHERE id = %s", (s_id,))
                
                # 2. Subtract XP & Wipe Streak
                cur.execute("""
                    UPDATE users 
                    SET xp = GREATEST(0, xp - %s), streak = 0 
                    WHERE id = %s
                """, (stake, u_id))
                
                print(f"REAPER STRIKE: User {u_id} | Mission {s_id} | -{stake} XP")

            conn.commit()
        
    except Exception as e:
        # This will tell us EXACTLY why it is crashing/restarting
        print(f"CRITICAL SYSTEM FAILURE: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    print(f"ZENITH WARDEN ONLINE. WATCHING: {DB_CONFIG['dbname']}")
    while True:
        audit_focus()
        time.sleep(5)