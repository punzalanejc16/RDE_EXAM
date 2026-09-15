import os
import time
import math
import threading
from collections import defaultdict, deque


class RateLimiter:
    """
    In-memory sliding-window limiter (per process).
    Usage: check() before the action, hit() to record it, reset() on success.
    """

    def __init__(self, limit, window_seconds):
        self.limit = limit
        self.window = window_seconds
        self._events = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key, now):
        events = self._events[key]
        while events and events[0] <= now - self.window:
            events.popleft()
        if not events:
            del self._events[key]
        return events

    def retry_after(self, key):
        """Seconds until the key may try again, or 0 if allowed now."""
        now = time.monotonic()
        with self._lock:
            events = self._prune(key, now)
            if len(events) < self.limit:
                return 0
            return max(1, math.ceil(events[0] + self.window - now))

    def hit(self, key):
        with self._lock:
            self._events[key].append(time.monotonic())

    def reset(self, key):
        with self._lock:
            self._events.pop(key, None)


def _env_int(name, default):
    try:
        return max(1, int(os.getenv(name, default)))
    except ValueError:
        return default


# Failed sign-ins: tight per account, looser per IP (exam rooms often share one IP)
login_failures_by_user = RateLimiter(_env_int('LOGIN_FAILURES_PER_ACCOUNT', 5), 15 * 60)
login_failures_by_ip = RateLimiter(_env_int('LOGIN_FAILURES_PER_IP', 30), 15 * 60)
# New registrations per IP per hour (raise it if a whole exam room registers from one network)
registrations_by_ip = RateLimiter(_env_int('REGISTRATIONS_PER_IP_PER_HOUR', 20), 60 * 60)
