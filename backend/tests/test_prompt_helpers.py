import httpx
import pytest

from app.config import Settings
from app.schemas import QuestRequest
from app.services.llm import _build_prompt, _extract_json


def test_quest_prompt_contains_preferences_and_safety_rules():
    request = QuestRequest(
        environment="Garden",
        duration_minutes=10,
        interests=["Insects"],
        difficulty="Beginner",
    )

    prompt = _build_prompt(request)

    assert "Environment: Garden" in prompt
    assert "Interests: Insects" in prompt
    assert "Never suggest eating" in prompt


def test_model_json_extraction_does_not_need_network():
    assert _extract_json('```json\n{"quest_title": "Local test"}\n```') == {
        "quest_title": "Local test"
    }


def test_online_generation_is_disabled_without_configuration():
    assert Settings(_env_file=None).enable_online_generation is False


@pytest.mark.asyncio
async def test_test_guard_blocks_openrouter_transport():
    async with httpx.AsyncClient() as client:
        with pytest.raises(AssertionError, match="Network access is disabled during tests"):
            await client.get("https://openrouter.ai/api/v1/health")