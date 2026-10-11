import json
from unittest.mock import MagicMock

import httpx
import pytest
from httpx import ASGITransport, AsyncClient, Response

from app.main import app, settings
from app.services import llm


AI_REQUEST = {
    "quest_title": "The Canopy & Bark Trail",
    "instruction": "Compare the shape of several fallen leaves.",
    "category": "Plants",
    "observation": "A broad leaf has a glossy surface and a toothed edge.",
}

AI_ANSWER = {
    "what_it_might_be": "It may be a broadleaf tree leaf; the description is not enough to identify a species.",
    "why_it_looks_or_behaves_that_way": "A waxy cuticle can reduce water loss, while toothed edges vary among species and conditions.",
    "real_world_uses": "Leaves contribute to shade, habitat, and carbon capture; no medicinal use can be inferred here.",
    "practical_tip": "Compare several fallen leaves without picking or tasting plants.",
    "explore_next": "Note whether similar leaves grow in sun or shade.",
    "facts_and_uncertainty": "Known: leaves vary in surface and margin. Guess: this leaf's identity cannot be established from text alone.",
}


class MockProviderClient:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.payload = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def post(self, _url, *, json, headers):
        self.payload = json
        if self.error:
            raise self.error
        return self.response


@pytest.fixture(autouse=True)
def disable_live_provider(monkeypatch):
    """Prevent tests from reaching a real provider, regardless of backend/.env."""
    monkeypatch.setattr(settings, "enable_online_generation", False)
    monkeypatch.setattr(llm.settings, "enable_online_generation", False)
    monkeypatch.setattr(llm.settings, "openrouter_api_key", "")


@pytest.mark.asyncio
async def test_ask_ai_success_uses_mocked_free_model(monkeypatch):
    monkeypatch.setattr(settings, "enable_online_generation", True)
    monkeypatch.setattr(llm.settings, "openrouter_api_key", "mock-key")
    provider_response = MagicMock(spec=Response)
    provider_response.json.return_value = {
        "choices": [{"message": {"content": json.dumps(AI_ANSWER)}}]
    }
    provider_response.raise_for_status.return_value = None

    provider_client = MockProviderClient(response=provider_response)
    monkeypatch.setattr(llm.httpx, "AsyncClient", lambda **_kwargs: provider_client)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/ai/explain-observation", json=AI_REQUEST)

    assert response.status_code == 200
    assert response.json() == AI_ANSWER
    sent_payload = provider_client.payload
    assert sent_payload["model"] == "nvidia/nemotron-3.5-lightning:free"
    prompt = sent_payload["messages"][0]["content"]
    assert "Plants" in prompt
    assert AI_REQUEST["observation"] in prompt


@pytest.mark.asyncio
async def test_ask_ai_rejects_empty_observation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/ai/explain-observation",
            json={**AI_REQUEST, "observation": "   "},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_ask_ai_preflight_allows_vite_loopback_origin():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.options(
            "/ai/explain-observation",
            headers={
                "Origin": "http://127.0.0.1:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"


@pytest.mark.asyncio
async def test_ask_ai_provider_failure_returns_retryable_error(monkeypatch):
    monkeypatch.setattr(settings, "enable_online_generation", True)
    monkeypatch.setattr(llm.settings, "openrouter_api_key", "mock-key")
    provider_client = MockProviderClient(error=httpx.ConnectError("mock connection failure"))
    monkeypatch.setattr(llm.httpx, "AsyncClient", lambda **_kwargs: provider_client)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/ai/explain-observation", json=AI_REQUEST)

    assert response.status_code == 502
    assert "retry" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_ask_ai_disabled_explains_online_requirement(monkeypatch):
    def unexpected_provider_call(**_kwargs):
        pytest.fail("Disabled Ask AI must not construct an OpenRouter client.")

    monkeypatch.setattr(llm.httpx, "AsyncClient", unexpected_provider_call)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/ai/explain-observation", json=AI_REQUEST)

    assert response.status_code == 503
    assert "online mode" in response.json()["detail"].lower()