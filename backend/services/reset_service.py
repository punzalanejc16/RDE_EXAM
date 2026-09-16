import os
import time
import uuid
import secrets
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from services.json_store import JsonStore

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESETS_JSON_PATH = os.path.join(BASE_DIR, 'password_resets.json')

STATUS_PENDING = 'pending'    # candidate asked, admin has not acted yet
STATUS_ISSUED = 'issued'      # admin approved, a one-time code exists
STATUS_USED = 'used'          # candidate set a new password
STATUS_DENIED = 'denied'      # admin refused the request

CODE_MAX_MINUTES = int(os.getenv('RESET_CODE_MAX_MINUTES', '60'))
KEEP_FINISHED = 100  # how many used/denied requests to keep in the file

# No 0/O/1/I so codes are easy to read out loud or write down
CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

store = JsonStore(RESETS_JSON_PATH, list)


def _now_text():
    return datetime.now().strftime("%m/%d/%Y, %I:%M:%S %p")


def _generate_code():
    return '-'.join(
        ''.join(secrets.choice(CODE_ALPHABET) for _ in range(4)) for _ in range(2)
    )


def public_request(record):
    """Reset request without the code hash."""
    return {k: v for k, v in record.items() if k != 'codeHash'}


def _prune(records):
    finished = [r for r in records if r['status'] in (STATUS_USED, STATUS_DENIED)]
    if len(finished) <= KEEP_FINISHED:
        return records
    drop = {id(r) for r in finished[: len(finished) - KEEP_FINISHED]}
    return [r for r in records if id(r) not in drop]


def request_reset(user):
    """Records a candidate's request. One open request per account."""
    with store.lock:
        records = [dict(r) for r in store.load()]
        open_request = next(
            (r for r in records if r['userId'] == user['id'] and r['status'] in (STATUS_PENDING, STATUS_ISSUED)),
            None
        )
        if open_request:
            # Asking again replaces any code already issued
            open_request.update(
                status=STATUS_PENDING, requestedAt=_now_text(), codeHash=None,
                issuedAt=None, expiresAt=None
            )
            store.save(_prune(records))
            return dict(open_request)

        record = {
            "id": uuid.uuid4().hex,
            "userId": user['id'],
            "username": user['username'],
            "fullName": user['fullName'],
            "email": user.get('email'),
            "status": STATUS_PENDING,
            "requestedAt": _now_text(),
            "issuedAt": None,
            "expiresAt": None,
            "usedAt": None,
            "codeHash": None,
        }
        records.append(record)
        store.save(_prune(records))
        return dict(record)


def list_requests():
    with store.lock:
        return [public_request(r) for r in store.load()]


def open_request_count():
    with store.lock:
        return sum(1 for r in store.load() if r['status'] == STATUS_PENDING)


def approve_request(request_id):
    """Approves a request and returns (request, plain_code). The code is shown only once."""
    code = _generate_code()
    with store.lock:
        records = [dict(r) for r in store.load()]
        record = next((r for r in records if r['id'] == request_id), None)
        if not record:
            return None, None
        if record['status'] not in (STATUS_PENDING, STATUS_ISSUED):
            return record, None
        record.update(
            status=STATUS_ISSUED,
            codeHash=generate_password_hash(code),
            issuedAt=_now_text(),
            expiresAt=int(time.time()) + CODE_MAX_MINUTES * 60,
        )
        store.save(records)
        return dict(record), code


def deny_request(request_id):
    with store.lock:
        records = [dict(r) for r in store.load()]
        record = next((r for r in records if r['id'] == request_id), None)
        if not record:
            return None
        record.update(status=STATUS_DENIED, codeHash=None, expiresAt=None)
        store.save(records)
        return dict(record)


def redeem_code(user, code):
    """Checks a one-time code and marks it used. Returns (ok, error_message)."""
    with store.lock:
        records = [dict(r) for r in store.load()]
        record = next(
            (r for r in records if r['userId'] == user['id'] and r['status'] == STATUS_ISSUED),
            None
        )
        if not record:
            return False, 'No approved reset request was found for this account. Please request a password reset first.'
        if record.get('expiresAt') and time.time() > record['expiresAt']:
            record.update(status=STATUS_DENIED, codeHash=None)
            store.save(records)
            return False, 'That reset code has expired. Please request a new password reset.'
        if not check_password_hash(record['codeHash'] or '', code):
            return False, 'That reset code is not correct.'

        record.update(status=STATUS_USED, codeHash=None, usedAt=_now_text(), expiresAt=None)
        store.save(records)
        return True, None


def drop_for_user(user_id):
    """Removes reset requests belonging to a deleted account."""
    with store.lock:
        records = store.load()
        remaining = [r for r in records if r['userId'] != user_id]
        if len(remaining) != len(records):
            store.save(remaining)
        return len(records) - len(remaining)
