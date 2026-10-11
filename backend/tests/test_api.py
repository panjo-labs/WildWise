# Backend tests – offline-first, OpenRouter mock, rate limiting, and fallback verification
# Real API call KABHI NAHI hoti. All tests are purely mocked.

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from httpx import AsyncClient, ASGITransport, Response

from app.main import app, settings, _request_history
from app.schemas import QuestRequest
from app.services import llm
from app.services.llm import generate_quest

# --- Test fixtures ---

VALID_QUEST_PAYLOAD = {
    "environment": "Park",
    "duration_minutes": 20,
    "interests": ["Plants", "Birds"],
    "difficulty": "Beginner",
}

MOCK_ONLINE_QUEST = {
    "quest_title": "The Canopy & Meadow Expedition",
    "introduction": "Explore the park and uncover the quiet connections between trees and pollinators.",
    "estimated_minutes": 20,
    "challenges": [
        {
            "id": 1,
            "title": "Leaf Shape Survey",
            "instruction": "Find 3 different leaf shapes and describe their edges: smooth, toothed, or lobed.",
            "fact": "Leaf shape helps plants maximize sunlight while reducing wind damage.",
        },
        {
            "id": 2,
            "title": "Bird Song Count",
            "instruction": "Stand still for 2 minutes and count how many distinct bird calls you hear.",
            "fact": "Birds use unique songs for territory marking and attracting mates.",
        },
        {
            "id": 3,
            "title": "Bark Texture Sketch",
            "instruction": "Find two trees and compare their bark: rough, smooth, peeling, or ridged?",
            "fact": "Bark protects trees from temperature extremes and pests.",
        },
    ],
    "is_offline": False,
    "source": "ai_generated",
}


@pytest.fixture(autouse=True)
def clear_rate_limits(monkeypatch):
    """Clear state and prevent real provider calls unless a test explicitly mocks them."""
    _request_history.clear()
    monkeypatch.setattr(settings, "enable_online_generation", False)
    monkeypatch.setattr(llm.settings, "enable_online_generation", False)
    monkeypatch.setattr(llm.settings, "openrouter_api_key", "")
    yield
    _request_history.clear()


# --- Tests ---

@pytest.mark.asyncio
async def test_health_endpoint():
    """Health check endpoint status, model name, aur online_generation_enabled boolean deta hai."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model" in data
    assert "online_generation_enabled" in data
    assert isinstance(data["online_generation_enabled"], bool)


@pytest.mark.asyncio
async def test_offline_by_default_without_api_key():
    """
    Default settings mein online generation disabled hai, isliye
    bina kisi API key ke valid bundled offline quest return hona chahiye.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/quests/generate", json=VALID_QUEST_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["is_offline"] is True
    assert data["source"] == "offline_curated"
    assert 3 <= len(data["challenges"]) <= 5
    assert all(k in data["challenges"][0] for k in ["id", "title", "instruction", "fact"])


@pytest.mark.asyncio
async def test_bundled_direct_endpoint():
    """GET /quests/bundled bina kisi network call ke curated quest return karta hai."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/quests/bundled?environment=Park&difficulty=Beginner")
    assert response.status_code == 200
    data = response.json()
    assert data["is_offline"] is True
    assert data["source"] == "offline_curated"
    assert len(data["challenges"]) >= 3


@pytest.mark.asyncio
async def test_online_generation_when_mocked_valid_output():
    """Valid OpenRouter mock response pe quest sahi Pydantic structure me parse hota hai."""
    from app.schemas import QuestResponse
    mock_resp = QuestResponse(**MOCK_ONLINE_QUEST)
    with patch("app.main.generate_quest", new_callable=AsyncMock, return_value=mock_resp):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/quests/generate", json=VALID_QUEST_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["quest_title"] == "The Canopy & Meadow Expedition"
    assert data["source"] == "ai_generated"
    assert data["is_offline"] is False


@pytest.mark.asyncio
async def test_service_level_openrouter_mock_success():
    """Service level test: mocked httpx client returns valid OpenRouter chat completion JSON."""
    raw_mock_content = json.dumps({
        "quest_title": "Nemotron Nature Journey",
        "introduction": "An exploration guided by structured observation.",
        "estimated_minutes": 20,
        "challenges": [
            {"id": 1, "title": "C1", "instruction": "Look at leaves", "fact": "Fact 1"},
            {"id": 2, "title": "C2", "instruction": "Listen for birds", "fact": "Fact 2"},
            {"id": 3, "title": "C3", "instruction": "Feel bark", "fact": "Fact 3"},
        ]
    })
    mock_http_response = MagicMock(spec=Response)
    mock_http_response.status_code = 200
    mock_http_response.json.return_value = {
        "choices": [{"message": {"content": raw_mock_content}}]
    }
    mock_http_response.raise_for_status.return_value = None

    req = QuestRequest(**VALID_QUEST_PAYLOAD)
    with patch("app.services.llm.settings.enable_online_generation", True), \
         patch("app.services.llm.settings.openrouter_api_key", "sk-mock-test-key"), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_http_response):
        quest = await generate_quest(req, allow_fallback=False)
        assert quest.quest_title == "Nemotron Nature Journey"
        assert quest.source == "ai_generated"
        assert len(quest.challenges) == 3


@pytest.mark.asyncio
async def test_online_malformed_output_fallback_handling():
    """Jab OpenRouter malformed non-JSON output de toh safe offline bundled quest pe fallback hota hai."""
    mock_http_response = MagicMock(spec=Response)
    mock_http_response.status_code = 200
    mock_http_response.json.return_value = {
        "choices": [{"message": {"content": "Sorry, I cannot format this in JSON. Here is text instead."}}]
    }
    mock_http_response.raise_for_status.return_value = None

    req = QuestRequest(**VALID_QUEST_PAYLOAD)
    with patch("app.services.llm.settings.enable_online_generation", True), \
         patch("app.services.llm.settings.openrouter_api_key", "sk-mock-test-key"), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_http_response):
        # Fallback enabled (default)
        fallback_quest = await generate_quest(req, allow_fallback=True)
        assert fallback_quest.is_offline is True
        assert fallback_quest.source == "offline_curated"
        assert len(fallback_quest.challenges) >= 3


@pytest.mark.asyncio
async def test_online_provider_error_fallback_handling():
    """Jab OpenRouter HTTP 500 de toh safe offline bundled quest pe fallback hota hai."""
    mock_response = MagicMock(spec=Response)
    mock_response.status_code = 500
    mock_request = MagicMock()
    status_error = httpx.HTTPStatusError("500 Server Error", request=mock_request, response=mock_response)
    mock_response.raise_for_status.side_effect = status_error

    req = QuestRequest(**VALID_QUEST_PAYLOAD)
    with patch("app.services.llm.settings.enable_online_generation", True), \
         patch("app.services.llm.settings.openrouter_api_key", "sk-mock-test-key"), \
         patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        fallback_quest = await generate_quest(req, allow_fallback=True)
        assert fallback_quest.is_offline is True
        assert fallback_quest.source == "offline_curated"


@pytest.mark.asyncio
async def test_invalid_environment():
    """Invalid environment pe 422 error aana chahiye."""
    payload = {**VALID_QUEST_PAYLOAD, "environment": "Mars"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/quests/generate", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_invalid_duration():
    """Duration sirf 10, 20, ya 30 min allow hona chahiye."""
    payload = {**VALID_QUEST_PAYLOAD, "duration_minutes": 45}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/quests/generate", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_empty_interests():
    """Koi interest select na ho toh 422 validation fail."""
    payload = {**VALID_QUEST_PAYLOAD, "interests": []}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/quests/generate", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_provider_failure_when_fallback_disabled():
    """Jab fallback disabled ho aur provider fail ho toh 502 service unavailable."""
    with patch("app.main.generate_quest", new_callable=AsyncMock, side_effect=RuntimeError("provider down")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/quests/generate?fallback=false", json=VALID_QUEST_PAYLOAD)
    assert response.status_code == 502


@pytest.mark.asyncio
async def test_provider_timeout_when_fallback_disabled():
    """Timeout pe 504 status return hona chahiye jab fallback disabled ho."""
    with patch("app.main.generate_quest", new_callable=AsyncMock, side_effect=TimeoutError("timed out")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/quests/generate?fallback=false", json=VALID_QUEST_PAYLOAD)
    assert response.status_code == 504


@pytest.mark.asyncio
async def test_rate_limiting_enforcement():
    """Ek hi client IP se rapid requests aane par 429 Too Many Requests milna chahiye."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        responses = []
        for _ in range(12):
            res = await client.post("/quests/generate", json=VALID_QUEST_PAYLOAD)
            responses.append(res.status_code)
        assert 429 in responses
