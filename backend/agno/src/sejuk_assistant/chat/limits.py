from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import UUID


class RateLimitExceeded(Exception):
    pass


class RequestLimiter:
    def __init__(self, per_minute: int, concurrent: int) -> None:
        self.per_minute = per_minute
        self.concurrent = concurrent
        self._requests: dict[UUID, deque[float]] = defaultdict(deque)
        self._active: dict[UUID, int] = defaultdict(int)
        self._lock = asyncio.Lock()

    @asynccontextmanager
    async def acquire(self, user_id: UUID) -> AsyncIterator[None]:
        async with self._lock:
            now = time.monotonic()
            requests = self._requests[user_id]
            while requests and requests[0] <= now - 60:
                requests.popleft()
            if len(requests) >= self.per_minute or self._active[user_id] >= self.concurrent:
                raise RateLimitExceeded("Request limit exceeded.")
            requests.append(now)
            self._active[user_id] += 1
        try:
            yield
        finally:
            async with self._lock:
                self._active[user_id] = max(self._active[user_id] - 1, 0)
