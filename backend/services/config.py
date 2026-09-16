import os
import secrets
import threading

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRET_KEY_PATH = os.path.join(BASE_DIR, '.secret_key')

_lock = threading.Lock()
_secret = None


def get_secret_key():
    # Use SECRET_KEY from .env if set; otherwise generate one and save it so sessions survive a restart
    global _secret
    env_key = os.getenv('SECRET_KEY')
    if env_key:
        return env_key
    with _lock:
        if _secret:
            return _secret
        if os.path.exists(SECRET_KEY_PATH):
            with open(SECRET_KEY_PATH, 'r', encoding='utf-8') as f:
                _secret = f.read().strip()
        if not _secret:
            _secret = secrets.token_hex(32)
            with open(SECRET_KEY_PATH, 'w', encoding='utf-8') as f:
                f.write(_secret)
        return _secret


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')


def env_list(name, default=''):
    return [item.strip() for item in os.getenv(name, default).split(',') if item.strip()]
