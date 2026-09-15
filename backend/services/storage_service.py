import os
import uuid
from services.json_store import JsonStore

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS_JSON_PATH = os.path.join(BASE_DIR, 'results.json')

store = JsonStore(RESULTS_JSON_PATH, list)

SUMMARY_FIELDS = (
    'id', 'userId', 'username', 'studentName', 'attemptNumber', 'score', 'total',
    'percentage', 'status', 'startTime', 'timestamp', 'durationSeconds'
)


def _ensure_ids():
    """Backfills an id on legacy records that lack one. Must hold store.lock."""
    history = store.load()
    if any(not r.get('id') for r in history):
        history = [r if r.get('id') else {**r, 'id': uuid.uuid4().hex} for r in history]
        store.save(history)
    return history


def get_user_attempts(user):
    """All submissions for an account, oldest first. Retakes are allowed."""
    with store.lock:
        return [r for r in store.load() if r.get('userId') == user['id']]


def attempt_summary(user):
    attempts = get_user_attempts(user)
    last = attempts[-1] if attempts else None
    return {
        "attemptCount": len(attempts),
        "lastAttempt": {
            "score": last['score'],
            "total": last['total'],
            "percentage": last['percentage'],
            "status": last['status'],
            "timestamp": last['timestamp'],
        } if last else None,
    }


def find_by_attempt_id(attempt_id):
    with store.lock:
        return next((r for r in store.load() if r.get('attemptId') == attempt_id), None)


def save_attempt(user, attempt_id, build_record):
    """
    Saves one exam attempt. Returns (record, created).
    - Idempotent: resubmitting the same attempt returns the existing record.
    - The attempt number is assigned inside the lock, so it's unique per user.
    """
    with store.lock:
        history = _ensure_ids()
        existing = next((r for r in history if r.get('attemptId') == attempt_id), None)
        if existing:
            return existing, False

        attempt_number = max(
            (r.get('attemptNumber') or 0 for r in history if r.get('userId') == user['id']),
            default=0
        ) + 1
        record = {"id": uuid.uuid4().hex, "attemptId": attempt_id, **build_record(attempt_number)}
        store.save(history + [record])
        return record, True


def get_result_summaries():
    """Lightweight list for the admin table (no per-question breakdown)."""
    with store.lock:
        return [{k: r.get(k) for k in SUMMARY_FIELDS} for r in _ensure_ids()]


def get_result(result_id):
    with store.lock:
        return next((r for r in _ensure_ids() if r.get('id') == result_id), None)


def delete_result(result_id):
    with store.lock:
        history = _ensure_ids()
        remaining = [r for r in history if r.get('id') != result_id]
        if len(remaining) == len(history):
            return False
        store.save(remaining)
        return True
