# FastAPI app – WildWise backend
# Safe offline-first architecture aur rate-limiting ke saath

import time
from collections import defaultdict
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import AskAIRequest, QuestRequest, QuestResponse, HealthResponse
from app.services.llm import explain_observation, generate_quest
from app.data.bundled_quests import get_bundled_quest

settings = get_settings()

app = FastAPI(
    title="WildWise API",
    description="Nature quest exploration with offline-first support and optional open-weight model generation",
    version="1.1.0",
)

# CORS – frontend origins allowed
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory rate limiting (per client IP)
# IMPORTANT: In-memory rate limiting helps mitigate rapid local request flooding,
# but does NOT guarantee complete protection against distributed abuse or external provider costs.
_request_history = defaultdict(list)


def _check_rate_limit(client_ip: str, max_requests: int = 10, window_seconds: int = 60) -> bool:
    """Sliding-window in-memory rate check."""
    now = time.time()
    valid_window = [ts for ts in _request_history[client_ip] if now - ts < window_seconds]
    if len(valid_window) >= max_requests:
        _request_history[client_ip] = valid_window
        return False
    valid_window.append(now)
    _request_history[client_ip] = valid_window
    return True


@app.get("/health", response_model=HealthResponse)
async def health():
    """Backend status aur online AI generation ka current state."""
    model_name = settings.active_model_id if settings.enable_online_generation else f"{settings.active_model_id} (disabled/offline mode)"
    return HealthResponse(
        status="ok",
        model=model_name,
        online_generation_enabled=settings.enable_online_generation,
    )


@app.get("/quests/bundled", response_model=QuestResponse)
async def get_bundled(
    environment: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
):
    """Bina internet ya provider call ke seedha curated offline quest laata hai."""
    quest_data = get_bundled_quest(environment=environment, difficulty=difficulty)
    return QuestResponse(**quest_data)


@app.post("/quests/generate", response_model=QuestResponse)
async def create_quest(
    req: QuestRequest,
    request: Request,
    fallback: bool = Query(True, description="Fallback to curated offline quest if online generation fails"),
):
    """
    User ke preferences ke hisaab se quest laata hai.
    Offline-first by default: agar online AI generation disabled hai toh bundled quest deta hai.
    """
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip, max_requests=settings.rate_limit_per_minute):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a moment before requesting another quest.",
        )

    try:
        quest = await generate_quest(req, allow_fallback=fallback)
        return quest
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except PermissionError:
        raise HTTPException(status_code=401, detail="API credentials invalid. Contact admin.")
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Quest generation timed out. Try again.")
    except RuntimeError:
        raise HTTPException(status_code=502, detail="Quest generation service unavailable.")
    except Exception:
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")


@app.post("/ai/explain-observation")
async def explain_observed_nature(req: AskAIRequest):
    """Return a model-generated explanation; never substitute an offline answer."""
    if not settings.enable_online_generation:
        raise HTTPException(
            status_code=503,
            detail="AI learning requires online mode. Enable online AI and retry.",
        )

    try:
        return await explain_observation(req)
    except PermissionError:
        raise HTTPException(status_code=401, detail="AI provider credentials are invalid.")
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
