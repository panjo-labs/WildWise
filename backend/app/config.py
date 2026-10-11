# WildWise backend configuration
# Environment variables ko yahan se padha jata hai

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Online AI generation flag - default False (offline-first, no unexpected costs)
    enable_online_generation: bool = False

    # OpenRouter API credentials and model configuration
    # Default model: nvidia/nemotron-3.5-lightning:free (OpenMDW-1.1 license, free tier)
    openrouter_api_key: str = ""
    openrouter_model_id: str = "nvidia/nemotron-3.5-lightning:free"
    openrouter_api_base: str = "https://openrouter.ai/api/v1"

    # Optional aliases for backwards compatibility
    groq_api_key: str = ""
    groq_api_base: str = "https://api.groq.com/openai/v1"
    llm_model_id: str = ""
    gemma_model_id: str = ""

    @property
    def active_model_id(self) -> str:
        """Returns configured model ID (defaults to OpenRouter free model)."""
        return self.openrouter_model_id or self.llm_model_id or self.gemma_model_id or "nvidia/nemotron-3.5-lightning:free"

    @property
    def active_api_key(self) -> str:
        """Returns configured API key."""
        return self.openrouter_api_key or self.groq_api_key or ""

    @property
    def active_api_base(self) -> str:
        """Returns configured API base URL."""
        return self.openrouter_api_base or self.groq_api_base or "https://openrouter.ai/api/v1"

    # CORS ke liye allowed frontend origin
    frontend_url: str = "http://localhost:5173"

    # Request timeout in seconds
    llm_timeout_seconds: int = 15

    # Ask AI has no offline fallback and the free model can be slow, so it waits longer
    ask_ai_timeout_seconds: int = 45

    # Simple in-memory rate limiting (max quest generation requests per minute per IP)
    rate_limit_per_minute: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
