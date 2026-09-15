import os
import time
from datetime import datetime
from flask import Blueprint, abort, g, jsonify, send_from_directory
from services.auth_service import require_auth, issue_attempt_ticket, read_attempt_ticket
from services.exam_service import (
    load_questions, evaluate_exam, validate_answers, resolve_image, IMAGES_DIR
)
from services.storage_service import save_attempt
from services.http_utils import json_body

exam_bp = Blueprint('exam', __name__)
TIME_FORMAT = "%m/%d/%Y, %I:%M:%S %p"


def candidate_result(record):
    """What a candidate may see after submitting: score only, never the answer key."""
    return {k: record.get(k) for k in (
        'id', 'studentName', 'attemptNumber', 'score', 'total', 'percentage',
        'status', 'startTime', 'timestamp', 'durationSeconds'
    )}


@exam_bp.route('/api/questions', methods=['GET'])
@require_auth('candidate')
def get_questions():
    return jsonify(load_questions())


@exam_bp.route('/api/exam/start', methods=['POST'])
@require_auth('candidate')
def start_exam():
    ticket, payload = issue_attempt_ticket(g.current_user)
    return jsonify({
        "attemptTicket": ticket,
        "startTime": datetime.fromtimestamp(payload['st']).strftime(TIME_FORMAT),
        "questions": load_questions(),
    }), 200


@exam_bp.route('/api/submit', methods=['POST'])
@require_auth('candidate')
def submit_exam():
    user = g.current_user
    data = json_body()

    ticket, error = read_attempt_ticket(data.get('attemptTicket'), user)
    if error:
        return jsonify({"error": error}), 400
    answers, error = validate_answers(data.get('answers', {}))
    if error:
        return jsonify({"error": error}), 400

    def build_record(attempt_number):
        score, total, percentage, status, breakdown = evaluate_exam(answers)
        now = time.time()
        return {
            "timestamp": datetime.fromtimestamp(now).strftime(TIME_FORMAT),
            "startTime": datetime.fromtimestamp(ticket['st']).strftime(TIME_FORMAT),
            "durationSeconds": max(0, int(now - ticket['st'])),
            "userId": user['id'],
            "username": user['username'],
            "studentName": user['fullName'],
            "attemptNumber": attempt_number,
            "score": score,
            "total": total,
            "percentage": percentage,
            "status": status,
            "detailedBreakdown": breakdown
        }

    record, created = save_attempt(user, ticket['aid'], build_record)
    return jsonify({**candidate_result(record), "alreadySubmitted": not created}), 200 if not created else 201


@exam_bp.route('/api/images/<image_id>', methods=['GET'])
def serve_image(image_id):
    if len(image_id) != 32 or not image_id.isalnum():
        abort(404)
    filename = resolve_image(image_id)
    if not filename or not os.path.isfile(os.path.join(IMAGES_DIR, filename)):
        abort(404)
    response = send_from_directory(IMAGES_DIR, filename, max_age=3600)
    response.headers.pop('Content-Disposition', None)
    return response
