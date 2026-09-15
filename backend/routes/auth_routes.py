import re
from flask import Blueprint, g, jsonify
from services.auth_service import (
    check_admin_credentials, admin_profile, admin_username, issue_token, require_auth,
    revoke_admin_sessions
)
from services.user_service import (
    create_user, find_by_username, verify_password, public_user, revoke_sessions,
    STATUS_PENDING, STATUS_REJECTED
)
from services.storage_service import attempt_summary
from services.http_utils import json_body, text_field, client_ip
from services.rate_limit import login_failures_by_user, login_failures_by_ip, registrations_by_ip

auth_bp = Blueprint('auth_bp', __name__)

USERNAME_RE = re.compile(r'^[A-Za-z0-9._-]{3,30}$')
EMAIL_RE = re.compile(r'^[^@\s]{1,64}@[^@\s]+\.[^@\s]+$')
MAX_NAME_LENGTH = 80
MAX_EMAIL_LENGTH = 254
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


def _too_many(retry_after):
    minutes = max(1, round(retry_after / 60))
    response = jsonify({"error": f'Too many attempts. Please try again in about {minutes} minute{"s" if minutes != 1 else ""}.'})
    response.headers['Retry-After'] = str(retry_after)
    return response, 429


def _session_payload(user):
    payload = public_user(user)
    if user['role'] == 'candidate':
        payload.update(attempt_summary(user))
    return payload


@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    ip = client_ip()
    wait = registrations_by_ip.retry_after(ip)
    if wait:
        return _too_many(wait)

    data = json_body()
    full_name = ' '.join(text_field(data, 'fullName').split())
    username = text_field(data, 'username').strip()
    email = text_field(data, 'email').strip()
    password = text_field(data, 'password')

    if not 2 <= len(full_name) <= MAX_NAME_LENGTH:
        return jsonify({"error": f'Full name must be 2-{MAX_NAME_LENGTH} characters.'}), 400
    if not USERNAME_RE.match(username):
        return jsonify({"error": 'Username must be 3-30 characters (letters, numbers, . _ -).'}), 400
    if username.lower() == admin_username().lower():
        return jsonify({"error": 'That username is reserved.'}), 400
    if len(email) > MAX_EMAIL_LENGTH or not EMAIL_RE.match(email):
        return jsonify({"error": 'Please enter a valid email address.'}), 400
    if not MIN_PASSWORD_LENGTH <= len(password) <= MAX_PASSWORD_LENGTH:
        return jsonify({"error": f'Password must be {MIN_PASSWORD_LENGTH}-{MAX_PASSWORD_LENGTH} characters.'}), 400

    user, error = create_user(full_name, username, email, password)
    if error:
        return jsonify({"error": error}), 409

    registrations_by_ip.hit(ip)
    return jsonify({
        "success": True,
        "message": 'Registration submitted. An administrator must approve your account before you can sign in.',
        "user": public_user(user),
    }), 201


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = json_body()
    username = text_field(data, 'username').strip()
    password = text_field(data, 'password')

    if not username or not password:
        return jsonify({"error": 'Please enter your username and password.'}), 400
    if len(username) > 64 or len(password) > MAX_PASSWORD_LENGTH:
        return jsonify({"error": 'Invalid username or password.'}), 401

    ip = client_ip()
    user_key = username.lower()
    wait = max(login_failures_by_user.retry_after(user_key), login_failures_by_ip.retry_after(ip))
    if wait:
        return _too_many(wait)

    def failed(message='Invalid username or password.', status=401):
        login_failures_by_user.hit(user_key)
        login_failures_by_ip.hit(ip)
        return jsonify({"error": message}), status

    if check_admin_credentials(username, password):
        login_failures_by_user.reset(user_key)
        return jsonify({"token": issue_token(admin_profile()), "user": admin_profile()}), 200

    user = find_by_username(username)
    if not verify_password(user, password):
        return failed()

    login_failures_by_user.reset(user_key)
    if user['status'] == STATUS_PENDING:
        return jsonify({
            "error": 'Your account is awaiting administrator approval.',
            "accountStatus": STATUS_PENDING,
        }), 403
    if user['status'] == STATUS_REJECTED:
        return jsonify({
            "error": 'Your registration was not approved. Please contact the administrator.',
            "accountStatus": STATUS_REJECTED,
        }), 403

    return jsonify({"token": issue_token(user), "user": _session_payload(user)}), 200


@auth_bp.route('/api/auth/me', methods=['GET'])
@require_auth()
def me():
    return jsonify({"user": _session_payload(g.current_user)}), 200


@auth_bp.route('/api/auth/logout', methods=['POST'])
@require_auth()
def logout():
    # Ends every active session for this account (all devices)
    if g.current_user['role'] == 'admin':
        revoke_admin_sessions()
    else:
        revoke_sessions(g.current_user['id'])
    return jsonify({"success": True}), 200
