// Backend ke saath saari communication aur offline-first quest handling
// Provider ya endpoint change karna ho toh sirf yahan aao

import { getBundledQuest } from "../data/bundledQuests";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Nature quest praapt karta hai.
 * Offline mode active hone par koi API request nahi karta.
 * Online generation fail ya disabled hone par curated offline quest return karta hai.
 *
 * @param {Object} params - { environment, duration_minutes, interests, difficulty }
 * @param {Object} options - { isOffline: boolean }
 * @returns {Promise<Object>} - Quest response
 */
export async function generateQuest(params, options = {}) {
  const { isOffline = false } = options;

  // Offline mode active hai toh seedha bundled curated quest use karo — zero network calls!
  if (isOffline) {
    const offlineQuest = getBundledQuest(params);
    return {
      ...offlineQuest,
      is_offline: true,
      source: "offline_curated",
    };
  }

  // Online generation attempt karte hain
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s client timeout

    const response = await fetch(`${API_BASE}/quests/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // Provider error ya rate limit hone par offline collection pe fallback
      const fallback = getBundledQuest(params);
      return {
        ...fallback,
        is_offline: true,
        source: "offline_curated",
        fallback_notice: err.detail || "Online AI generation unavailable. Loaded offline curated quest.",
      };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    // Network failure, timeout, ya backend down — safe offline fallback
    const fallback = getBundledQuest(params);
    return {
      ...fallback,
      is_offline: true,
      source: "offline_curated",
      fallback_notice: "Network unavailable or backend offline. Loaded offline curated quest.",
    };
  }
}

/** Requests a model explanation for an observation; never substitutes offline content. */
export async function explainObservation(params) {
  let response;
  try {
    response = await fetch(`${API_BASE}/ai/explain-observation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(60000), // must outlast the backend's Ask AI timeout (45s)
    });
  } catch (err) {
    if (err?.name === "TimeoutError") {
      throw new Error("The AI is taking too long to answer. Please retry.");
    }
    throw new Error("AI learning requires online mode and a working connection. Please retry.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Online AI is unavailable. Please retry.");
  }
  return data;
}

/** Backend health check karta hai. */
export async function checkHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return { status: "degraded", online_generation_enabled: false };
    }
    return await response.json();
  } catch {
    return { status: "offline", online_generation_enabled: false };
  }
}
