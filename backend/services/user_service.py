import os
import uuid
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from services.json_store import JsonStore

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USERS_JSON_PATH = os.path.join(BASE_DIR, 'users.json')

STATUS_PENDING = 'pending'
STATUS_APPROVED = 'approved'
STATUS_REJECTED = 'rejected'

store = JsonStore(USERS_JSON_PATH, list)

# Used when a username doesn't exist so failed logins take the same time either way
_DUMMY_HASH = generate_password_hash('timing-equalizer-not-a-real-password')


def _now():
    return datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p")


def public_user(user):
    """User record without sensitive or internal fields."""
    return {k: v for k, v in user.items() if k not in ('passwordHash', 'sessionVersion')}


def find_by_username(username):
    key = username.strip().lower()
    with store.lock:
        return next((dict(u) for u in store.load() if u['username'].lower() == key), None)


def find_by_id(user_id):
    with store.lock:
        return next((dict(u) for u in store.load() if u['id'] == user_id), None)


def find_by_username_or_email(identifier):
    key = identifier.strip().lower()
    with store.lock:
        return next(
            (dict(u) for u in store.load()
             if u['username'].lower() == key or (u.get('email') or '').lower() == key),
            None
        )


def create_user(full_name, username, email, password):
    """Registers a new candidate in pending status. Returns (user, error)."""
    with store.lock:
        users = store.load()
        if any(u['username'].lower() == username.lower() for u in users):
            return None, 'That username is already taken.'
        if any((u.get('email') or '').lower() == email.lower() for u in users):
            return None, 'An account with that email already exists.'

        user = {
            "id": uuid.uuid4().hex,
            "fullName": full_name,
            "username": username,
            "email": email,
            "passwordHash": generate_password_hash(password),
            "role": "candidate",
            "status": STATUS_PENDING,
            "sessionVersion": 1,
            "createdAt": _now(),
            "reviewedAt": None,
        }
        store.save(users + [user])
        return dict(user), None


def verify_password(user, password):
    if user is None:
        check_password_hash(_DUMMY_HASH, password)
        return False
    return check_password_hash(user['passwordHash'], password)


def list_users(status=None):
    with store.lock:
        users = store.load()
        return [public_user(u) for u in users if not status or u['status'] == status]


def _update_user(user_id, changes_fn):
    with store.lock:
        users = [dict(u) for u in store.load()]
        for u in users:
            if u['id'] == user_id:
                changes_fn(u)
                store.save(users)
                return dict(u)
    return None


def set_user_status(user_id, status):
    def apply(u):
        if u['status'] != status:
            # Changing status ends any active sessions for this account
            u['sessionVersion'] = u.get('sessionVersion', 1) + 1
        u['status'] = status
        u['reviewedAt'] = _now()
    return _update_user(user_id, apply)


def set_password(user_id, password):
    """Sets a new password and ends every active session for the account."""
    def apply(u):
        u['passwordHash'] = generate_password_hash(password)
        u['sessionVersion'] = u.get('sessionVersion', 1) + 1
        u['passwordChangedAt'] = _now()
    return _update_user(user_id, apply)


def revoke_sessions(user_id):
    return _update_user(user_id, lambda u: u.update(sessionVersion=u.get('sessionVersion', 1) + 1))


def delete_user(user_id):
    with store.lock:
        users = store.load()
        remaining = [u for u in users if u['id'] != user_id]
        if len(remaining) == len(users):
            return False
        store.save(remaining)
        return True
