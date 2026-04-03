"""
Adaptive CropShield — Database Module
MongoDB connection via pymongo. Falls back to an in-memory mock for local dev.
"""

import os
from datetime import datetime


class _MockCollection:
    """In-memory collection used when MongoDB is not available."""
    def __init__(self):
        self._data = []

    def insert_one(self, doc):
        self._data.append(doc)

    def find(self, query=None, projection=None):
        data = list(self._data)
        if projection and "_id" in projection and projection["_id"] == 0:
            data = [{k: v for k, v in d.items() if k != "_id"} for d in data]
        return _Cursor(data)

    def count_documents(self, query=None):
        return len(self._data)


class _Cursor:
    def __init__(self, data):
        self._data = data
        self._sort_key = None
        self._sort_dir = 1
        self._limit_val = None

    def sort(self, key, direction=-1):
        self._sort_key = key
        self._sort_dir = direction
        return self

    def limit(self, n):
        self._limit_val = n
        return self

    def __iter__(self):
        data = self._data
        if self._sort_key:
            data = sorted(data, key=lambda d: d.get(self._sort_key, ""), reverse=(self._sort_dir == -1))
        if self._limit_val:
            data = data[:self._limit_val]
        return iter(data)


class Database:
    def __init__(self, uri: str = "", db_name: str = "cropshield"):
        self.predictions = _MockCollection()
        self._connected = False

        try:
            from pymongo import MongoClient
            from pymongo.errors import ServerSelectionTimeoutError

            client = MongoClient(uri, serverSelectionTimeoutMS=3000)
            client.server_info()
            db = client[db_name]
            self.predictions = db["predictions"]
            self._connected = True
            print(f"[Database] Connected to MongoDB: {db_name}")
        except ImportError:
            print("[Database] pymongo not installed. Using in-memory mock.")
        except Exception as e:
            print(f"[Database] MongoDB unavailable ({e}). Using in-memory mock.")

    @property
    def is_connected(self):
        return self._connected
