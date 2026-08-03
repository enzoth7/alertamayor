import httpx
import pytest

from app.collectors.brave import BraveSearchCollector
from app.collectors.google_places import GooglePlacesCollector


@pytest.mark.asyncio
async def test_brave_search_uses_api_and_parses_mocked_response() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["X-Subscription-Token"] == "test-key"
        assert request.url.params["country"] == "UY"
        assert request.url.params["q"] == "residencial adultos mayores uruguay"
        return httpx.Response(
            200,
            request=request,
            json={
                "web": {
                    "results": [
                        {
                            "url": "https://residencial.example.uy/",
                            "title": "Residencial Ejemplo",
                            "description": "Atención de larga estadía",
                        }
                    ]
                }
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        collector = BraveSearchCollector("test-key", client=client)
        result = await collector.search("residencial adultos mayores uruguay", count=5)
    assert result.http_status == 200
    assert len(result.hits) == 1
    assert result.hits[0].title == "Residencial Ejemplo"
    assert "test-key" not in result.request_url


@pytest.mark.asyncio
async def test_google_collector_requests_only_manual_link_fields() -> None:
    place_id = "ChIJ_test_place_12345"

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["X-Goog-FieldMask"] == "id,googleMapsUri"
        assert request.url.path.endswith(place_id)
        return httpx.Response(
            200,
            request=request,
            json={
                "id": place_id,
                "googleMapsUri": "https://maps.google.com/?cid=123",
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        collector = GooglePlacesCollector("test-key", client=client)
        result = await collector.resolve_manual_place_id(place_id)
    assert result.place_id == place_id
    assert result.google_maps_url == "https://maps.google.com/?cid=123"
