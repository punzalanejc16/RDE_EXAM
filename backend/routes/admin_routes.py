import os
from flask import Blueprint, jsonify, request
from services.storage_service import get_all_results

admin_bp = Blueprint('admin_bp', __name__)


@admin_bp.route('/api/admin/login', methods=['POST'])
def admin_login():
    # Inilagay sa loob ng function para basahin agad ang bagong .env passphrase sa bawat login request
    admin_passphrase = os.getenv('ADMIN_PASSPHRASE')

    data = request.get_json() or {}
    user_pass = data.get('passphrase', '')

    if user_pass and user_pass == admin_passphrase:
        return jsonify({'success': True, 'message': 'Login successful'}), 200

    return (
        jsonify(
            {'success': False, 'error': 'Invalid passphrase. Access denied.'}
        ),
        401,
    )


@admin_bp.route('/api/admin/results', methods=['GET'])
def get_admin_results():
    return jsonify(get_all_results())