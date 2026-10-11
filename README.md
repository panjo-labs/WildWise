# 🌿 WildWise

**Offline-First Nature Exploration Web App — Touch Grass**

WildWise encourages people to explore the outdoors with structured observation challenges. Step outside, complete engaging observation activities in your park, garden, or forest, and record your field discoveries in a private digital journal.

> *The app prepares the adventure. You experience the real world.*

---

## Key Features

- **Offline-First by Default**: Fully functional without an internet connection or API key using a rich bundled collection of varied nature quests.
- **Privacy & Local Storage**: Quest progress, field journal entries, observations, and user preferences persist in browser `localStorage`. Observations are not uploaded automatically; choosing **Ask AI** in online mode sends that card's quest context and observation to the backend and configured model for an explanation. Saved answers remain in the browser journal.
- **Cost & Quota Protection**: Online AI generation is disabled by default (`ENABLE_ONLINE_GENERATION=false`) to prevent unexpected provider charges or quota exhaustion until explicitly enabled.
- **OpenRouter Free Model Integration**: Configured for `nvidia/nemotron-3.5-lightning:free` via OpenRouter (`https://openrouter.ai/api/v1/chat/completions`). Uses strictly the free endpoint with zero paid fallbacks or automatic paid routing.
- **API Key Security**: Provider keys reside strictly on the backend environment. They are never exposed to frontend code, browser storage, API responses, logs, or version control.
- **Lightweight Backend Rate Limiting**: Built-in sliding-window rate limiting (10 req/min per IP) and request timeouts protect against accidental client request floods. *(Note: in-memory rate limiting helps prevent local flooding, but does not completely prevent distributed abuse or provider costs).*

---

## Architecture

```
WildWise/
├── Frontend/          # React + Vite SPA (Mobile-first)
│   ├── public/        # _redirects (Render SPA rewrite)
│   └── src/
│       ├── components/   # Navbar, QuestCard, LoadingState
│       ├── data/         # bundledQuests.js (Offline curated nature quests)
│       ├── pages/        # Home, Quest, Journal
│       ├── services/     # api.js (offline-first fetch & fallback), storage.js (localStorage)
│       └── styles/       # tokens.css, components.css, page CSS
├── backend/           # Python FastAPI
│   └── app/
│       ├── main.py       # Routes, rate limiting, CORS
│       ├── config.py     # pydantic-settings config
│       ├── schemas.py    # Request/response validation models
│       ├── data/         # bundled_quests.py (Backend bundled quests)
│       └── services/
│           └── llm.py    # OpenRouter integration with safe offline fallback
└── .env.example       # Configuration template
```

---

## Model & Provider Configuration

| Setting | Default Value | Notes |
|---------|---------------|-------|
| `ENABLE_ONLINE_GENERATION` | `false` | Disabled by default. Keeps the app completely free and offline-ready. |
| `OPENROUTER_MODEL_ID` | `nvidia/nemotron-3.5-lightning:free` | Model identifier on OpenRouter. |
| `OPENROUTER_API_BASE` | `https://openrouter.ai/api/v1` | OpenRouter OpenAI-compatible endpoint. |
| `OPENROUTER_API_KEY` | *(empty)* | Kept private in `backend/.env`. Never exposed to frontend or Git. |
| `LLM_TIMEOUT_SECONDS` | `15` | Client and backend timeout to prevent hanging connections. |
| `RATE_LIMIT_PER_MINUTE` | `10` | In-memory sliding window per IP. |

### Free-Tier Status & Considerations for `nvidia/nemotron-3.5-lightning:free`
- **License**: Released under NVIDIA's **OpenMDW-1.1** open-weights license permitting research, commercial use, and post-training.
- **Pricing**: $0.00 / 1M tokens on OpenRouter's `:free` endpoint.
- **Rate Limits**: OpenRouter applies concurrency and request rate limits to `:free` models (typically ~20 requests/minute depending on platform capacity).
- **Structured Output / JSON Support**: The `:free` variant does **not** support parameter-level schema enforcement (`response_format: {"type": "json_object"}`). In WildWise, valid JSON output is achieved through strict prompt instructions + regex extraction + Pydantic schema validation. If the model produces unparseable or schema-violating output, WildWise **safely falls back to bundled curated offline quests**.
- **No Paid Fallback**: The backend does **not** configure paid fallback models or auto-routing, preventing any surprise charges.

---

## Local Setup

### 1. Clone & Configure Environment

```bash
# Copy template for local configuration
cp .env.example backend/.env
```

`backend/.env` is pre-configured with `ENABLE_ONLINE_GENERATION=false`.

If you wish to test with OpenRouter in the future:
1. Obtain an API key from [OpenRouter Keys](https://openrouter.ai/keys).
2. Set `OPENROUTER_API_KEY=your_key_here` in `backend/.env`.
3. Set `ENABLE_ONLINE_GENERATION=true` in `backend/.env`.

### 2. Run the Backend

```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend runs at `http://localhost:8000`. Test the health endpoint:
```bash
curl http://localhost:8000/health
```

### 3. Run the Frontend

```bash
cd Frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## Offline Usage

1. Open `http://localhost:5173`.
2. Notice the **Offline Mode Active** indicator.
3. Choose your environment, duration, and interests.
4. Click **Load Offline Quest**.
5. Complete observations outdoors and save them to your **Field Journal**.
6. The app functions completely without internet, backend, or API keys.

---

## Running Tests

All unit tests run without an external network connection or API keys:

```bash
cd backend
.\venv\Scripts\activate   # or source venv/bin/activate
python -m pytest tests/ -v
```

13 automated tests cover:
- Health check and configuration status
- Default offline quest generation without API keys
- Direct bundled quest endpoint
- Mocked OpenRouter chat completion parsing (valid output)
- Mocked OpenRouter service-level integration
- Mocked OpenRouter malformed output handling & offline fallback
- Mocked OpenRouter provider error handling & offline fallback
- Input validation (environments, durations, interests)
- Provider failure and timeout handling
- In-memory rate limiting enforcement

---

## Deployment on Render

### Backend (Web Service)
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips "*"`
  - The proxy flags make the per-IP rate limit see each visitor's real IP. Without them, every visitor appears to come from Render's proxy and shares one limit.
- **Environment Variables**:
  - `ENABLE_ONLINE_GENERATION`: `false` (or `true` if you wish to enable online calls and Ask AI)
  - `FRONTEND_URL`: `https://your-frontend.onrender.com` (exact origin: `https`, no trailing slash, otherwise the browser blocks requests with CORS)
  - `OPENROUTER_API_KEY`: *(Private key from OpenRouter, set only in the Render dashboard; leave blank if offline)*
  - `OPENROUTER_MODEL_ID`: `nvidia/nemotron-3.5-lightning:free`
  - `PYTHON_VERSION`: `3.10.14` *(optional; matches the version used in development)*
  - `ASK_AI_TIMEOUT_SECONDS` / `LLM_TIMEOUT_SECONDS` / `RATE_LIMIT_PER_MINUTE`: *(optional; defaults are 45, 15 and 10)*
- **Check**: open `https://your-backend.onrender.com/health`. It should report `"online_generation_enabled": true`. The root URL `/` returns `{"detail":"Not Found"}` by design, because the backend is an API only.

### Frontend (Static Site)
- **Root Directory**: `Frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `https://your-backend.onrender.com` (no trailing slash; Vite bakes this in at build time, so redeploy the static site after changing it)

### Deployment notes
- **Deploy order**: backend first, then the frontend, then set the backend's `FRONTEND_URL` to the frontend's URL.
- **Free-plan cold starts**: an idle free web service sleeps and can take 30-60 seconds to wake. The first quest request may fall back to an offline quest and the first Ask AI click may fail; open `/health` first and retry.
- **Free-model privacy**: OpenRouter's free endpoint logs prompts and may use them to improve the model. Do not enter personal or sensitive details in observations.
- **Secrets**: never commit `backend/.env`. If a key is ever exposed, rotate it at https://openrouter.ai/keys.
- **Troubleshooting Ask AI**: backend logs show a safe line such as `Ask AI output rejected: reason=...` or `provider_code=... provider_message=...`. These never include keys or your observation text.

---

## Safety Principles

All WildWise quests adhere strictly to observation safety:
- **Observation only**: Never instructs eating, tasting, smelling, or touching unfamiliar flora or fauna.
- **Leave no trace**: Encourages respectful exploration within public areas.
- **Privacy by design**: Journal reflections remain in browser storage and are never uploaded.

---

## License

MIT
