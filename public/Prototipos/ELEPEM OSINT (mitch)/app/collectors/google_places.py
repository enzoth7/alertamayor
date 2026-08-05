import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote, urlsplit

import httpx

from app.collectors.brave import CollectorConfigurationError

_PLACE_ID = re.compile(r"^[A-Za-z0-9_-]{10,255}$")


@dataclass(frozen=True, slots=True)
class GooglePlaceLink:
    place_id: str
    google_maps_url: str
    retrieved_at: datetime
    request_url: str
    http_status: int


class GooglePlacesCollector:
    """Resolve a manually supplied place_id without collecting Google content."""

    endpoint = "https://places.googleapis.com/v1/places"

    def __init__(
        self,
        api_key: str | None,
        *,
        timeout: float = 20.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        if not api_key:
            raise CollectorConfigurationError("GOOGLE_PLACES_API_KEY is not configured")
        self._api_key = api_key
        self._client = client
        self._timeout = timeout

    async def resolve_manual_place_id(self, place_id: str) -> GooglePlaceLink:
        if not _PLACE_ID.fullmatch(place_id):
            raise ValueError("Invalid Google place_id")
        url = f"{self.endpoint}/{quote(place_id, safe='')}"
        headers = {
            "Accept": "application/json",
            "X-Goog-Api-Key": self._api_key,
            "X-Goog-FieldMask": "id,googleMapsUri",
        }
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=self._timeout)
        try:
            response = await client.get(url, headers=headers)
            retrieved_at = datetime.now(UTC)
            response.raise_for_status()
            payload: dict[str, Any] = response.json()
        finally:
            if owns_client:
                await client.aclose()
        returned_id = str(payload.get("id", ""))
        maps_url = str(payload.get("googleMapsUri", ""))
        maps_host = urlsplit(maps_url).hostname
        valid_maps_url = bool(
            maps_url.startswith("https://")
            and maps_host
            and (maps_host == "google.com" or maps_host.endswith(".google.com"))
        )
        if returned_id != place_id or not valid_maps_url:
            raise ValueError("Google Places returned an unexpected response")
        return GooglePlaceLink(
            place_id=place_id,
            google_maps_url=maps_url,
            retrieved_at=retrieved_at,
            request_url=str(response.request.url),
            http_status=response.status_code,
        )
