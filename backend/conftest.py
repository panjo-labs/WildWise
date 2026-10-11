import httpx
import pytest

from app.main import settings
from app.services import llm


@pytest.fixture(autouse=True)
def disable_online_generation_and_network(monkeypatch):
    """Keep every backend test offline, even when local environment config changes."""
    monkeypatch.setattr(settings, "enable_online_generation", False)
    monkeypatch.setattr(llm.settings, "enable_online_generation", False)
    monkeypatch.setattr(llm.settings, "openrouter_api_key", "")

    def block_sync_http(_transport, request):
        raise AssertionError(f"Network access is disabled during tests: {request.url.host}")

    async def block_async_http(_transport, request):
        raise AssertionError(f"Network access is disabled during tests: {request.url.host}")

    monkeypatch.setattr(httpx.HTTPTransport, "handle_request", block_sync_http)
    monkeypatch.setattr(httpx.AsyncHTTPTransport, "handle_async_request", block_async_http)

@pytest.fixture(autouse=True)
def reset_rate_limit_history():
    """Rate-limit buckets are module-global; keep tests independent of each other."""
    from app.main import _request_history

    _request_history.clear()
    yield
    _request_history.clear()
