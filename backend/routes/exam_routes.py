import os
from datetime import datetime
from flask import Blueprint, jsonify, request, send_from_directory
from services.exam_service import load_questions, evaluate_exam
from services.storage_service import check_candidate_exists, save_to_json, get_all_results

exam_bp = Blueprint('exam', __name__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

@exam_bp.route('/api/questions', methods=['GET'])
def get_questions():
    return jsonify(load_questions())

@exam_bp.route('/api/check-name', methods=['POST'])
def check_name():
    data = request.get_json()
    name = data.get('studentName', '').strip()
    return jsonify({"exists": check_candidate_exists(name)}), 200

@exam_bp.route('/api/submit', methods=['POST'])
def submit_exam():
    data = request.get_json()
    student_name = data.get('studentName', 'Anonymous').strip()
    answers = data.get('answers', {})
    start_time = data.get('startTime', 'N/A')

    if check_candidate_exists(student_name):
        return jsonify({"error": "Candidate has already completed the examination."}), 400

    score, total, percentage, status, answer_key, breakdown = evaluate_exam(answers)
    timestamp = datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p")

    record = {
        "timestamp": timestamp,
        "startTime": start_time,
        "studentName": student_name,
        "score": score,
        "total": total,
        "percentage": percentage,
        "status": status,
        "detailedBreakdown": breakdown
    }

    save_to_json(record)
    return jsonify({**record, "answerKey": answer_key})

@exam_bp.route('/api/results', methods=['GET'])
def get_results():
    return jsonify(get_all_results())

@exam_bp.route('/static/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'static', 'images'), filename)