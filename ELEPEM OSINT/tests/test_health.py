import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_liveness_does_not_require_database() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_home_and_openapi_are_available_locally() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        home = await client.get("/")
        schema = await client.get("/openapi.json")
    assert home.status_code == 200
    assert "Descubrimiento conservador" in home.text
    assert "Agregar una pista pública manualmente" in home.text
    assert "/api/discovery/brave" in schema.json()["paths"]
    assert "/api/candidates/manual" in schema.json()["paths"]
    assert "/api/audit/verify" in schema.json()["paths"]
