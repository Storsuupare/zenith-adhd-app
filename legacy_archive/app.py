import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- 1. CONFIGURATION ---
DB_CONFIG = {
    "host": "localhost",
    "dbname": "zenith_io_db",
    "user": "postgres",
    "password": "Katlamac123?",
    "port": 5432
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

# --- 2. THE ZENITH MATH ENGINE ---
BASE_XP = 500
EXPONENT = 1.5

def get_total_xp_for_level(lvl):
    if lvl <= 1: return 0
    return int(BASE_XP * ((lvl - 1) ** EXPONENT))


@app.route('/start-session', methods=['POST'])
def start_session():
    data = request.json
    task_name = data.get('taskName')
    
    print(f"DEBUG: Received mission start for: {task_name}")
    
    # This JSON response is what tells the Browser "Everything is OK"
    return jsonify({
        "status": "success",
        "message": f"Mission '{task_name}' initiated in the backend.",
        "xp_multiplier": 1.5  # Just an example for later
    }), 200


# --- 3. ROUTES ---

@app.route('/get-stats', methods=['GET'])
def get_stats():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # 1. Raw Stats
        cur.execute("SELECT SUM(xp_gained) FROM sessions")
        total_xp = cur.fetchone()[0] or 0

        cur.execute("SELECT SUM(xp_gained) FROM sessions WHERE created_at >= CURRENT_DATE")
        today_xp = cur.fetchone()[0] or 0

        # 2. Streak Calculation (Checking for consecutive days with activity)
        cur.execute("""
            WITH RECURSIVE streak_calc AS (
                SELECT created_at::date as day, 1 as count
                FROM sessions
                WHERE created_at::date = CURRENT_DATE
                UNION ALL
                SELECT s.created_at::date, sc.count + 1
                FROM sessions s
                JOIN streak_calc sc ON s.created_at::date = sc.day - INTERVAL '1 day'
            )
            SELECT MAX(count) FROM streak_calc
        """)
        streak = cur.fetchone()[0] or 0
        cur.close()

        # 3. Level Math
        current_level = 1
        while total_xp >= get_total_xp_for_level(current_level + 1):
            current_level += 1

        xp_at_current_start = get_total_xp_for_level(current_level)
        xp_at_next_start = get_total_xp_for_level(current_level + 1)
        
        xp_in_level = total_xp - xp_at_current_start
        needed_for_next = xp_at_next_start - xp_at_current_start

        # 4. Return EVERYTHING
        return jsonify({
            "level": current_level,
            "xp_in_level": int(xp_in_level),
            "next_level_xp": int(needed_for_next),
            "total_xp": int(total_xp),
            "today_xp": int(today_xp),
            "streak": int(streak) # NEW
        })
    except Exception as e:
        print(f"!!! ENGINE FAILURE: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route('/save-session', methods=['POST'])
def save_session():
    data = request.json
    task = data.get('task_name', 'Unlabeled').strip().title()
    duration = int(data.get('duration', 0))
    category = data.get('category', 'General')
    xp_gained = int((duration * 10) * (1 + (duration / 120)))
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO sessions (task_name, duration_minutes, category, xp_gained) 
            VALUES (%s, %s, %s, %s)
        """, (task, duration, category, xp_gained))
        conn.commit()
        return jsonify({"message": "Vault Secured", "xp_earned": xp_gained}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()




@app.route('/get-history', methods=['GET'])
def get_history():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT task_name, duration_minutes, created_at 
            FROM sessions 
            ORDER BY created_at DESC 
            LIMIT 20
        """)
        rows = cur.fetchall()
        history = [{"task_name": r[0], "duration": r[1], "timestamp": r[2]} for r in rows]
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn: conn.close()

# --- 4. THE ONLY IGNITION (At the very bottom!) ---
if __name__ == '__main__':
    app.run(port=5000, debug=True)