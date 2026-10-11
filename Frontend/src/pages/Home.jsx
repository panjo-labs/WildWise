import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateQuest } from "../services/api";
import {
  saveQuestProgress,
  clearQuestProgress,
  loadUserPreferences,
  saveUserPreferences,
  getOfflineMode,
  setOfflineMode,
} from "../services/storage";
import LoadingState from "../components/LoadingState";
import "../styles/home.css";

// Available options
const ENVIRONMENTS = ["Garden", "Park", "Forest", "Anywhere Outdoors"];
const DURATIONS = [10, 20, 30];
const INTERESTS = ["Plants", "Birds", "Insects", "Textures", "General Discovery"];
const DIFFICULTIES = ["Beginner", "Curious Explorer"];

export default function Home() {
  // Saved preferences restore karte hain ya default values use karte hain
  const savedPrefs = loadUserPreferences() || {};
  const [environment, setEnvironment] = useState(savedPrefs.environment || "Park");
  const [duration, setDuration] = useState(savedPrefs.duration || 20);
  const [interests, setInterests] = useState(savedPrefs.interests || ["General Discovery"]);
  const [difficulty, setDifficulty] = useState(savedPrefs.difficulty || "Beginner");

  // Offline mode default: true (safe, zero cost, no external dependency)
  const [isOffline, setIsOffline] = useState(() => getOfflineMode());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // Preferences ko change hone par localStorage me persist karte hain
  useEffect(() => {
    saveUserPreferences({ environment, duration, interests, difficulty });
  }, [environment, duration, interests, difficulty]);

  function handleOfflineToggle(e) {
    const nextVal = e.target.checked;
    setIsOffline(nextVal);
    setOfflineMode(nextVal);
  }

  // Interest multi-select toggle
  function toggleInterest(interest) {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  async function handleGenerate() {
    if (interests.length === 0) {
      setError("Please select at least one interest.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const quest = await generateQuest(
        {
          environment,
          duration_minutes: duration,
          interests,
          difficulty,
        },
        { isOffline }
      );

      // Quest progress save karte hain aur quest page pe jaate hain
      clearQuestProgress();
      saveQuestProgress({
        quest: { ...quest, interests, environment },
        completedIds: [],
        observations: {},
        startedAt: new Date().toISOString(),
      });
      navigate("/quest");
    } catch (err) {
      setError(err.message || "Failed to generate quest. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <main className="page-content">
      <div className="container container--narrow">
        {/* Hero section */}
        <section className="home-hero">
          <div className="home-bg-decoration" aria-hidden="true" />

          <div className="home-hero__eyebrow">
            <span>🌍</span>
            <span>Offline-First · Safe Nature Exploration · Touch Grass</span>
          </div>

          <h1 className="home-hero__headline animate-fade-up">
            The world is more <em>interesting</em> outside.
          </h1>

          <p className="home-hero__subtext animate-fade-up animate-fade-up--delay-1">
            WildWise gives you curated and AI-assisted nature quests. 
            Step outside, observe your environment, and record what you discover.
          </p>

          {/* Online/Offline Status Banner */}
          <div
            className="status-card animate-fade-up"
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
              backgroundColor: isOffline ? "rgba(34, 197, 94, 0.1)" : "rgba(59, 130, 246, 0.1)",
              border: `1px solid ${isOffline ? "rgba(34, 197, 94, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-3)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span style={{ fontSize: "1.2rem" }}>{isOffline ? "🌲" : "🌐"}</span>
              <div>
                <strong style={{ fontSize: "var(--text-sm)", display: "block" }}>
                  {isOffline ? "Offline Mode Active" : "Online Mode (Fallback Enabled)"}
                </strong>
                <span style={{ fontSize: "var(--text-xs)", opacity: 0.85 }}>
                  {isOffline
                    ? "Using curated bundled quests. Zero API calls, no internet or keys needed."
                    : "Will attempt server generation; safely falls back to offline quests if unavailable."}
                </span>
              </div>
            </div>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--text-xs)",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={isOffline}
                onChange={handleOfflineToggle}
                id="offline-mode-toggle"
              />
              Offline Mode
            </label>
          </div>
        </section>

        {/* Quest builder */}
        <div className="quest-builder animate-fade-up animate-fade-up--delay-2">
          <h2 className="quest-builder__title">🗺️ Build Your Quest</h2>

          {error && (
            <div className="alert alert--error" role="alert" style={{ marginBottom: "var(--space-5)" }}>
              {error}
            </div>
          )}

          {/* Environment */}
          <div className="quest-builder__section form-group">
            <label className="form-label">Where are you going?</label>
            <div className="selector-grid" role="group" aria-label="Environment">
              {ENVIRONMENTS.map((env) => (
                <button
                  key={env}
                  className={`selector-chip${environment === env ? " selector-chip--selected" : ""}`}
                  onClick={() => setEnvironment(env)}
                  aria-pressed={environment === env}
                  id={`env-${env.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          <hr className="divider" />

          {/* Duration */}
          <div className="quest-builder__section form-group">
            <label className="form-label">How long do you have?</label>
            <div className="selector-grid" role="group" aria-label="Duration">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  className={`selector-chip${duration === d ? " selector-chip--selected" : ""}`}
                  onClick={() => setDuration(d)}
                  aria-pressed={duration === d}
                  id={`duration-${d}`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <hr className="divider" />

          {/* Interests – multi-select */}
          <div className="quest-builder__section form-group">
            <label className="form-label">
              What interests you?
              <span className="form-label__hint">Select one or more</span>
            </label>
            <div className="selector-grid" role="group" aria-label="Interests">
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  className={`selector-chip${interests.includes(interest) ? " selector-chip--selected" : ""}`}
                  onClick={() => toggleInterest(interest)}
                  aria-pressed={interests.includes(interest)}
                  id={`interest-${interest.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <hr className="divider" />

          {/* Difficulty */}
          <div className="quest-builder__section form-group">
            <label className="form-label">Experience level</label>
            <div className="selector-grid" role="group" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  className={`selector-chip${difficulty === d ? " selector-chip--selected" : ""}`}
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                  id={`difficulty-${d.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn btn--primary quest-builder__generate-btn"
            onClick={handleGenerate}
            disabled={loading || interests.length === 0}
            id="generate-quest-btn"
          >
            {isOffline ? "🌲 Load Offline Quest" : "🌿 Start Quest"}
          </button>
        </div>
      </div>
    </main>
  );
}
