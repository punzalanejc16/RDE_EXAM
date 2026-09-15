import os
import json
import time
import shutil
import threading


class StorageError(Exception):
    """Raised when a data file cannot be read or written safely."""


class JsonStore:
    """
    Thread-safe JSON file with atomic writes.

    - Every read and write goes through one lock, so readers never see a half-written file.
    - Writes go to a temp file first and are swapped in with os.replace (atomic).
    - The previous version is kept as <file>.bak.
    - A corrupt file raises StorageError instead of being treated as empty,
      so a bad read can never cause the next write to wipe all data.

    Note: the lock is per process. Run the backend as a single process (serve.py does).
    """

    def __init__(self, path, default_factory=list):
        self.path = path
        self.default_factory = default_factory
        self.lock = threading.RLock()
        self._cache = None
        self._stamp = None

    def _file_stamp(self):
        try:
            st = os.stat(self.path)
            return (st.st_mtime_ns, st.st_size)
        except FileNotFoundError:
            return None

    @staticmethod
    def _retry(fn, attempts=20, delay=0.05):
        # Windows/OneDrive can briefly hold a file open; retry instead of failing
        for i in range(attempts):
            try:
                return fn()
            except PermissionError:
                if i == attempts - 1:
                    raise
                time.sleep(delay)

    def load(self):
        """Returns the cached data. Callers must not mutate it outside `with store.lock`."""
        with self.lock:
            stamp = self._file_stamp()
            if stamp is None:
                self._cache, self._stamp = self.default_factory(), None
                return self._cache
            if stamp == self._stamp and self._cache is not None:
                return self._cache

            def read():
                with open(self.path, 'r', encoding='utf-8') as f:
                    return f.read()

            try:
                data = json.loads(self._retry(read))
            except (OSError, ValueError) as e:
                raise StorageError(f'Could not read {os.path.basename(self.path)}: {e}') from e
            if not isinstance(data, type(self.default_factory())):
                raise StorageError(f'Unexpected data format in {os.path.basename(self.path)}')

            self._cache, self._stamp = data, stamp
            return data

    def save(self, data):
        with self.lock:
            tmp_path = self.path + '.tmp'
            try:
                with open(tmp_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=4, ensure_ascii=False)
                    f.flush()
                    os.fsync(f.fileno())
                if os.path.exists(self.path):
                    self._retry(lambda: shutil.copyfile(self.path, self.path + '.bak'))
                self._retry(lambda: os.replace(tmp_path, self.path))
            except OSError as e:
                self._cache, self._stamp = None, None
                raise StorageError(f'Could not write {os.path.basename(self.path)}: {e}') from e

            self._cache, self._stamp = data, self._file_stamp()
