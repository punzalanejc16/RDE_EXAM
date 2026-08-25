import os
import json
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
from datetime import datetime

app = Flask(__name__, static_folder='static')
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(BASE_DIR, 'exam_data.xlsx')
RESULTS_JSON_PATH = os.path.join(BASE_DIR, 'results.json')

def load_questions():
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: Excel file not found at {EXCEL_PATH}")
        return []
    try:
        df = pd.read_excel(EXCEL_PATH, sheet_name='Questions')
        df = df.fillna('')
        questions = []
        for _, row in df.iterrows():
            questions.append({
                "questionNo": int(row['QuestionNo']),
                "questionText": str(row['QuestionText']),
                "options": {
                    "A": str(row['OptionA']),
                    "B": str(row['OptionB']),
                    "C": str(row['OptionC']),
                    "D": str(row['OptionD'])
                },
                "imageFileName": str(row['ImageFileName']).strip() if row['ImageFileName'] else None
            })
        return questions
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return []

def evaluate_exam(student_answers):
    if not os.path.exists(EXCEL_PATH):
        return 0, 0, 0.0, "FAILED", {}
    try:
        df_keys = pd.read_excel(EXCEL_PATH, sheet_name='AnswerKey')
        answer_key = dict(zip(df_keys['QuestionNo'], df_keys['CorrectAnswer']))
        
        score = 0
        total = len(answer_key)
        
        for q_no, user_ans in student_answers.items():
            q_no_int = int(q_no)
            if q_no_int in answer_key:
                if str(user_ans).strip().upper() == str(answer_key[q_no_int]).strip().upper():
                    score += 1

        percentage = round((score / total) * 100, 2) if total > 0 else 0.0
        status = "PASSED" if percentage >= 70.0 else "FAILED"
        
        # Format key to string dictionary
        formatted_key = {str(k): str(v).strip().upper() for k, v in answer_key.items()}
        return score, total, percentage, status, formatted_key
    except Exception as e:
        print(f"Error evaluating exam: {e}")
        return 0, 0, 0.0, "FAILED", {}

def check_candidate_exists(student_name):
    if not os.path.exists(RESULTS_JSON_PATH):
        return False
    try:
        with open(RESULTS_JSON_PATH, 'r', encoding='utf-8') as f:
            history = json.load(f)
            for record in history:
                if record.get('studentName', '').strip().lower() == student_name.strip().lower():
                    return True
    except Exception:
        pass
    return False

def save_to_json(record):
    history = []
    if os.path.exists(RESULTS_JSON_PATH):
        try:
            with open(RESULTS_JSON_PATH, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except Exception as e:
            print(f"Warning: Could not read JSON file. Creating new. {e}")

    history.append(record)

    with open(RESULTS_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=4, ensure_ascii=False)

@app.route('/api/questions', methods=['GET'])
def get_questions():
    return jsonify(load_questions())

@app.route('/api/check-name', methods=['POST'])
def check_name():
    data = request.get_json()
    name = data.get('studentName', '').strip()
    if check_candidate_exists(name):
        return jsonify({"exists": True}), 200
    return jsonify({"exists": False}), 200

@app.route('/api/submit', methods=['POST'])
def submit_exam():
    data = request.get_json()
    student_name = data.get('studentName', 'Anonymous').strip()
    answers = data.get('answers', {})

    if check_candidate_exists(student_name):
        return jsonify({"error": "Candidate has already completed the examination."}), 400

    score, total, percentage, status, answer_key = evaluate_exam(answers)
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    record = {
        "timestamp": timestamp,
        "studentName": student_name,
        "score": score,
        "total": total,
        "percentage": percentage,
        "status": status
    }

    # I-save sa JSON history
    save_to_json(record)

    # Ibalik sa frontend kasama ang answerKey para sa Review Mode
    return jsonify({
        **record,
        "answerKey": answer_key
    })

@app.route('/api/results', methods=['GET'])
def get_results():
    if os.path.exists(RESULTS_JSON_PATH):
        with open(RESULTS_JSON_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return jsonify(data)
    return jsonify([])

@app.route('/static/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'static', 'images'), filename)

if __name__ == '__main__':
    print(f"Loading exam items from: {EXCEL_PATH}")
    app.run(debug=True, port=5000)