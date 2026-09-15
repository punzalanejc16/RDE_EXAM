from flask import Blueprint, jsonify, request
from services.auth_service import require_auth
from services.exam_service import image_url
from services.storage_service import get_result_summaries, get_result, delete_result
from services.user_service import (
    list_users, set_user_status, delete_user, public_user,
    STATUS_PENDING, STATUS_APPROVED, STATUS_REJECTED
)

admin_bp = Blueprint('admin_bp', __name__)
VALID_STATUSES = {STATUS_PENDING, STATUS_APPROVED, STATUS_REJECTED}


@admin_bp.route('/api/admin/results', methods=['GET'])
@require_auth('admin')
def get_admin_results():
    return jsonify(get_result_summaries())


@admin_bp.route('/api/admin/results/<result_id>', methods=['GET'])
@require_auth('admin')
def get_admin_result(result_id):
    record = get_result(result_id)
    if not record:
        return jsonify({"error": 'Submission not found.'}), 404
    breakdown = [
        {**item, "imageUrl": image_url(item.get('imageFileName'))}
        for item in (record.get('detailedBreakdown') or [])
    ]
    return jsonify({**record, "detailedBreakdown": breakdown})


@admin_bp.route('/api/admin/results/<result_id>', methods=['DELETE'])
@require_auth('admin')
def remove_result(result_id):
    if not delete_result(result_id):
        return jsonify({"error": 'Submission not found.'}), 404
    return jsonify({"success": True}), 200


@admin_bp.route('/api/admin/users', methods=['GET'])
@require_auth('admin')
def get_users():
    status = request.args.get('status')
    if status and status not in VALID_STATUSES:
        return jsonify({"error": 'Invalid status filter.'}), 400
    return jsonify(list_users(status))


def _update_status(user_id, status):
    user = set_user_status(user_id, status)
    if not user:
        return jsonify({"error": 'User not found.'}), 404
    return jsonify({"success": True, "user": public_user(user)}), 200


@admin_bp.route('/api/admin/users/<user_id>/approve', methods=['POST'])
@require_auth('admin')
def approve_user(user_id):
    return _update_status(user_id, STATUS_APPROVED)


@admin_bp.route('/api/admin/users/<user_id>/reject', methods=['POST'])
@require_auth('admin')
def reject_user(user_id):
    return _update_status(user_id, STATUS_REJECTED)


@admin_bp.route('/api/admin/users/<user_id>', methods=['DELETE'])
@require_auth('admin')
def remove_user(user_id):
    if not delete_user(user_id):
        return jsonify({"error": 'User not found.'}), 404
    return jsonify({"success": True}), 200
