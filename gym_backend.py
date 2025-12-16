from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Allow React Native requests

DB_PATH = "gym_history.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS workouts
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  device_id TEXT,
                  exercise TEXT,
                  weight REAL,
                  target_reps INTEGER,
                  actual_reps INTEGER,
                  target_time INTEGER,
                  actual_time INTEGER,
                  timestamp TEXT)''')
    conn.commit()
    conn.close()

@app.route('/api/workout/complete', methods=['POST'])
def save_workout():
    try:
        data = request.json
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''INSERT INTO workouts 
                     (user_id, device_id, exercise, weight, target_reps, actual_reps, 
                      target_time, actual_time, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (data.get('user_id', 'unknown'),
                   data.get('device_id'),
                   data.get('exercise'),
                   data.get('weight'),
                   data.get('target_reps'),
                   data.get('actual_reps'),
                   data.get('target_time'),
                   data.get('actual_time'),
                   datetime.now().isoformat()))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Workout saved"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/history/<user_id>', methods=['GET'])
def get_history(user_id):
    print(f'History request for user_id: {user_id}')
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT * FROM workouts WHERE user_id=? ORDER BY timestamp DESC LIMIT 50', (user_id,))
        rows = c.fetchall()
        conn.close()
        result = [{
            "id": row[0], "exercise": row[3], "weight": row[4], 
            "target_reps": row[5], "actual_reps": row[6],
            "target_time": row[7], "actual_time": row[8],
            "timestamp": row[9]
        } for row in rows]
        print(f'Returning {len(result)} records')
        return jsonify(result)
    except Exception as e:
        print(f'Error: {e}')
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
