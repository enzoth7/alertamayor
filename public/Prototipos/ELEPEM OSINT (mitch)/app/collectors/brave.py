from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx


class CollectorConfigurationError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class BraveSearchHit:
    url: str
    title: str
    description: str | None


@dataclass(frozen=True, slots=True)
class BraveSearchResult:
    query: str
    request_url: str
    retrieved_at: datetime
    http_status: int
    hits: tuple[BraveSearchHit, ...]


class BraveSearchCollector:
    endpoint = "https://api.search.brave.com/res/v1/web/search"

    def __init__(
        self,
        api_key: str | None,
        *,
        timeout: float = 20.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        if not api_key:
            raise CollectorConfigurationError("BRAVE_SEARCH_API_KEY is not configured")
        self._api_key = api_key
        self._client = client
        self._timeout = timeout

    async def search(self, query: str, *, count: int = 10) -> BraveSearchResult:
        if not query.strip():
            raise ValueError("Search query cannot be empty")
        if len(query.strip()) > 400:
            raise ValueError("Search query cannot exceed 400 characters")
        params: dict[str, str | int] = {
            "q": query.strip(),
            "count": min(max(count, 1), 20),
            "country": "UY",
            "search_lang": "es",
        }
        headers = {"Accept": "application/json", "X-Subscription-Token": self._api_key}
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=self._timeout)
        try:
            response = await client.get(self.endpoint, params=params, headers=headers)
            retrieved_at = datetime.now(UTC)
            payload: dict[str, Any] = {} if response.is_error else response.json()
        finally:
            if owns_client:
                await client.aclose()
        raw_hits = payload.get("web", {}).get("results", [])
        hits = tuple(
            BraveSearchHit(
                url=str(item["url"]),
                title=str(item.get("title", "")).strip(),
                description=(str(item["description"]).strip() if item.get("description") else None),
            )
            for item in raw_hits
            if isinstance(item, dict) and item.get("url")
        )
        return BraveSearchResult(
            query=query.strip(),
            request_url=str(response.request.url),
            retrieved_at=retrieved_at,
            http_status=response.status_code,
            hits=hits,
        )
