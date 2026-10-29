from contextlib import contextmanager
from threading import RLock
from fastapi import HTTPException

_lock = RLock()
_active = 0
_maintenance = False

@contextmanager
def processing():
    global _active
    with _lock:
        if _maintenance:
            raise HTTPException(409, 'Local data is being maintained. Try again in a moment.')
        _active += 1
    try:
        yield
    finally:
        with _lock: _active -= 1

@contextmanager
def maintenance_window():
    global _maintenance
    with _lock:
        if _active or _maintenance:
            raise HTTPException(409, 'Stop live detection and wait for active analyses before deleting local data.')
        _maintenance = True
    try:
        yield
    finally:
        with _lock: _maintenance = False
