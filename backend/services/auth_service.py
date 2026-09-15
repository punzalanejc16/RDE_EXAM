import os
import hmac
import time
import uuid
import hashlib
from functools import wraps
from flask import g, jsonify, request
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from services.config import get_secret_key
from services.json_store import JsonStore
from services.user_service import find_by_id, STATUS_APPROVED

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_MAX_AGE_SECONDS = 12 * 60 * 60
ATTEMPT_MAX_AGE_SECONDS = int(os.getenv('EXAM_ATTEMPT_MAX_HOURS', '4')) * 60 * 60
ADMIN_ID = 'admin'
MIN_ADMIN_PASSWORD_LENGTH = 12

admin_state = JsonStore(os.path.join(BASE_DIR, 'admin_state.json'), dict)


def _serializer(salt):
    return URLSafeTimedSerializer(get_secret_key(), salt=salt)


# ── Admin credentials ──

def admin_username():
    return os.getenv('ADMIN_USERNAME', 'admin')


def _admin_password():
    return os.getenv('ADMIN_PASSWORD') or os.getenv('ADMIN_PASSPHRASE') or ''


def admin_password_problem():
    """Returns a warning string if the admin password is missing or weak, else None."""
    pw = _admin_password()
    if not pw:
        return 'ADMIN_PASSWORD is not set; admin sign-in is disabled.'
    if len(pw) < MIN_ADMIN_PASSWORD_LENGTH:
        return f'ADMIN_PASSWORD is shorter than {MIN_ADMIN_PASSWORD_LENGTH} characters.'
    if pw.lower().startswith('admin') or pw.isdigit():
        return 'ADMIN_PASSWORD is easy to guess. Use a long random password.'
    return None


def check_admin_credentials(username, password):
    admin_pw = _admin_password()
    if not admin_pw:
        return False
    user_ok = hmac.compare_digest(username.strip().lower().encode(), admin_username().lower().encode())
    pass_ok = hmac.compare_digest(password.encode(), admin_pw.encode())
    return user_ok and pass_ok


def _admin_fingerprint():
    # Admin tokens stop working when the admin password changes or the admin signs out
    with admin_state.lock:
        version = admin_state.load().get('sessionVersion', 1)
    digest = hmac.new(get_secret_key().encode(), _admin_password().encode(), hashlib.sha256).hexdigest()[:16]
    return f'{digest}:{version}'


def revoke_admin_sessions():
    with admin_state.lock:
        state = dict(admin_state.load())
        state['sessionVersion'] = state.get('sessionVersion', 1) + 1
        admin_state.save(state)


def admin_profile():
    return {
        "id": ADMIN_ID,
        "fullName": "Administrator",
        "username": admin_username(),
        "role": "admin",
        "status": STATUS_APPROVED,
    }


# ── Session tokens ──

def issue_token(user):
    if user['role'] == 'admin':
        payload = {"uid": ADMIN_ID, "role": "admin", "sv": _admin_fingerprint()}
    else:
        payload = {"uid": user['id'], "role": user['role'], "sv": user.get('sessionVersion', 1)}
    return _serializer('rde-exam-auth').dumps(payload)


def _resolve_token():
    """Returns (identity, error_message)."""
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return None, 'Authentication required.'
    try:
        data = _serializer('rde-exam-auth').loads(header[7:], max_age=TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired:
        return None, 'Your session has expired. Please sign in again.'
    except BadSignature:
        return None, 'Invalid session. Please sign in again.'
    if not isinstance(data, dict):
        return None, 'Invalid session. Please sign in again.'

    if data.get('role') == 'admin':
        if not _admin_password() or data.get('sv') != _admin_fingerprint():
            return None, 'Your session has ended. Please sign in again.'
        return admin_profile(), None

    user = find_by_id(data.get('uid'))
    if not user:
        return None, 'Account no longer exists.'
    if user['status'] != STATUS_APPROVED:
        return None, 'Your account is not approved.'
    if data.get('sv') != user.get('sessionVersion', 1):
        return None, 'Your session has ended. Please sign in again.'
    return user, None


def require_auth(role=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            identity, error = _resolve_token()
            if error:
                return jsonify({"error": error}), 401
            if role and identity['role'] != role:
                return jsonify({"error": 'You do not have permission to access this resource.'}), 403
            g.current_user = identity
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ── Exam attempt tickets ──

def issue_attempt_ticket(user):
    """Signed proof of when the server started this attempt; also the idempotency key."""
    payload = {"uid": user['id'], "aid": uuid.uuid4().hex, "st": int(time.time())}
    return _serializer('rde-exam-attempt').dumps(payload), payload


def read_attempt_ticket(ticket, user):
    """Returns (payload, error)."""
    if not isinstance(ticket, str) or not ticket:
        return None, 'Missing exam attempt. Please start the examination again.'
    try:
        data = _serializer('rde-exam-attempt').loads(ticket, max_age=ATTEMPT_MAX_AGE_SECONDS)
    except SignatureExpired:
        return None, 'This exam attempt has expired. Please start the examination again.'
    except BadSignature:
        return None, 'Invalid exam attempt. Please start the examination again.'
    if not isinstance(data, dict) or data.get('uid') != user['id']:
        return None, 'This exam attempt belongs to a different account.'
    return data, None
