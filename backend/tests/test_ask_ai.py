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

def _provider_body(content, finish_reason="stop", **message_extra):
    return {
        "model": "nvidia/nemotron-3.5-lightning:free",
        "choices": [{"finish_reason": finish_reason, "message": {"content": content, **message_extra}}],
        "usage": {"completion_tokens": 321},
    }


async def _ask_with_provider_body(monkeypatch, body, json_error=None):
    monkeypatch.setattr(settings, "enable_online_generation", True)
    monkeypatch.setattr(llm.settings, "openrouter_api_key", "mock-key")
    provider_response = MagicMock(spec=Response)
    provider_response.raise_for_status.return_value = None
    if json_error:
        provider_response.json.side_effect = json_error
    else:
        provider_response.json.return_value = body
    provider_client = MockProviderClient(response=provider_response)
    monkeypatch.setattr(llm.httpx, "AsyncClient", lambda **_kwargs: provider_client)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.post("/ai/explain-observation", json=AI_REQUEST), provider_client


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "body, reason",
    [
        (_provider_body(None, finish_reason="length", reasoning="thinking..."), "truncated_empty_content"),
        (_provider_body(None), "empty_content"),
        (_provider_body("   "), "empty_content"),
        (_provider_body(json.dumps(AI_ANSWER)[:120], finish_reason="length"), "truncated_json"),
        (_provider_body("Sure! Here is some text without any object."), "malformed_json"),
        (_provider_body(json.dumps([AI_ANSWER])), "json_not_object"),
        (_provider_body(json.dumps({k: v for k, v in AI_ANSWER.items() if k != "practical_tip"})), "schema_mismatch"),
        (_provider_body(json.dumps({**AI_ANSWER, "explore_next": ["a", "b"]})), "schema_mismatch"),
        ({"error": {"code": 429, "message": "rate limited"}}, "no_choices"),
        ({"choices": []}, "no_choices"),
        (["not", "an", "object"], "body_not_object"),
    ],
)
async def test_ask_ai_rejects_unusable_model_output_with_safe_diagnostics(monkeypatch, caplog, body, reason):
    with caplog.at_level("WARNING", logger="wildwise.llm"):
        response, _ = await _ask_with_provider_body(monkeypatch, body)

    assert response.status_code == 502
    assert "invalid explanation" in response.json()["detail"].lower()
    logged = caplog.text
    assert f"reason={reason}" in logged
    # Diagnostics must never carry credentials, user observations, or model text.
    assert "mock-key" not in logged
    assert AI_REQUEST["observation"] not in logged
    assert "Bearer" not in logged


@pytest.mark.asyncio
async def test_ask_ai_non_json_provider_body_returns_invalid_explanation(monkeypatch):
    response, _ = await _ask_with_provider_body(
        monkeypatch, None, json_error=json.JSONDecodeError("Expecting value", "<html>", 0)
    )

    assert response.status_code == 502
    assert "invalid explanation" in response.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "content",
    [
        json.dumps(AI_ANSWER),
        f"```json\n{json.dumps(AI_ANSWER)}\n```",
        f"Here is the explanation:\n{json.dumps(AI_ANSWER)}\nHope this helps!",
        [{"type": "text", "text": json.dumps(AI_ANSWER)}],
    ],
)
async def test_ask_ai_accepts_valid_explanation_in_common_wrappers(monkeypatch, content):
    response, provider_client = await _ask_with_provider_body(monkeypatch, _provider_body(content))

    assert response.status_code == 200
    assert response.json() == AI_ANSWER
    assert provider_client.payload["max_tokens"] == llm.ASK_AI_MAX_TOKENS


def test_extract_json_still_raises_when_no_object_is_present():
    with pytest.raises(json.JSONDecodeError):
        llm._extract_json("no braces here")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status, expected_detail",
    [(400, "unavailable"), (429, "rate limited")],
)
async def test_ask_ai_provider_http_error_logs_provider_reason_safely(monkeypatch, caplog, status, expected_detail):
    monkeypatch.setattr(settings, "enable_online_generation", True)
    monkeypatch.setattr(llm.settings, "openrouter_api_key", "mock-key")
    request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    provider_response = httpx.Response(
        status, request=request, json={"error": {"code": status, "message": "Provider says no"}}
    )
    provider_client = MockProviderClient(response=provider_response)
    monkeypatch.setattr(llm.httpx, "AsyncClient", lambda **_kwargs: provider_client)

    with caplog.at_level("WARNING", logger="wildwise.llm"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/ai/explain-observation", json=AI_REQUEST)

    assert response.status_code == 502
    assert expected_detail in response.json()["detail"].lower()
    assert f"provider_code={status}" in caplog.text
    assert "Provider says no" in caplog.text
    assert "mock-key" not in caplog.text
    assert AI_REQUEST["observation"] not in caplog.text


@pytest.mark.asyncio
async def test_ask_ai_uses_its_own_longer_timeout_and_reports_timeouts(monkeypatch):
    monkeypatch.setattr(settings, "enable_online_generation", True)
    monkeypatch.setattr(llm.settings, "openrouter_api_key", "mock-key")
    seen = {}

    def fake_client(**kwargs):
        seen.update(kwargs)
        return MockProviderClient(error=httpx.ReadTimeout("mock slow model"))

    monkeypatch.setattr(llm.httpx, "AsyncClient", fake_client)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/ai/explain-observation", json=AI_REQUEST)

    assert seen["timeout"] == llm.settings.ask_ai_timeout_seconds
    assert llm.settings.ask_ai_timeout_seconds > llm.settings.llm_timeout_seconds
    assert response.status_code == 504


def test_ask_ai_prompt_enforces_short_json_only_output():
    from app.schemas import AskAIRequest

    prompt = llm._build_observation_prompt(AskAIRequest(**AI_REQUEST))

    assert "under 40 words" in prompt
    assert "under 250 words" in prompt
    assert "JSON object only" in prompt
    # Untrusted input stays fenced as data, and strict validation is unchanged.
    assert "<user_observation>" in prompt


@pytest.mark.asyncio
async def test_ask_ai_disables_reasoning_and_ignores_think_blocks(monkeypatch):
    content = f"<think>long private reasoning {{not json}}</think>\n{json.dumps(AI_ANSWER)}"
    response, provider_client = await _ask_with_provider_body(monkeypatch, _provider_body(content))

    assert response.status_code == 200
    assert response.json() == AI_ANSWER
    assert provider_client.payload["reasoning"] == {"enabled": False}


@pytest.mark.asyncio
async def test_ask_ai_unfinished_thinking_is_reported_without_logging_text(monkeypatch, caplog):
    body = _provider_body("<think>still reasoning about the pigeon...", finish_reason="length")
    with caplog.at_level("WARNING", logger="wildwise.llm"):
        response, _ = await _ask_with_provider_body(monkeypatch, body)

    assert response.status_code == 502
    assert "reason=truncated_json" in caplog.text
    assert "starts_with_brace=False has_think_tag=True" in caplog.text
    assert "pigeon" not in caplog.text


@pytest.mark.asyncio
async def test_ask_ai_is_rate_limited_per_ip_and_blocks_before_provider_call(monkeypatch):
    monkeypatch.setattr(settings, "enable_online_generation", True)
    monkeypatch.setattr(llm.settings, "openrouter_api_key", "mock-key")
    monkeypatch.setattr(settings, "rate_limit_per_minute", 2)
    calls = []

    def counting_client(**_kwargs):
        calls.append(1)
        return MockProviderClient(error=httpx.ConnectError("mock"))

    monkeypatch.setattr(llm.httpx, "AsyncClient", counting_client)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        statuses = [(await client.post("/ai/explain-observation", json=AI_REQUEST)).status_code for _ in range(3)]

    assert statuses == [502, 502, 429]
    assert len(calls) == 2  # the limited request never reached OpenRouter


@pytest.mark.asyncio
async def test_quest_generation_disables_reasoning_and_ignores_think_blocks(monkeypatch):
    from app.data.bundled_quests import get_bundled_quest

    monkeypatch.setattr(settings, "enable_online_generation", True)
    monkeypatch.setattr(llm.settings, "enable_online_generation", True)
    monkeypatch.setattr(llm.settings, "openrouter_api_key", "mock-key")
    quest = get_bundled_quest(environment="Park", interests=["Birds"], difficulty="Beginner")
    quest = {k: quest[k] for k in ("quest_title", "introduction", "estimated_minutes", "challenges")}
    quest["quest_title"] = "Mocked AI Quest"
    provider_response = MagicMock(spec=Response)
    provider_response.raise_for_status.return_value = None
    provider_response.json.return_value = _provider_body(f"<think>hmm {{x}}</think>{json.dumps(quest)}")
    provider_client = MockProviderClient(response=provider_response)
    monkeypatch.setattr(llm.httpx, "AsyncClient", lambda **_kwargs: provider_client)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/quests/generate",
            json={"environment": "Park", "duration_minutes": 10, "interests": ["Birds"], "difficulty": "Beginner"},
        )

    assert response.status_code == 200
    assert response.json()["quest_title"] == "Mocked AI Quest"
    assert response.json()["source"] == "ai_generated"
    assert provider_client.payload["reasoning"] == {"enabled": False}
