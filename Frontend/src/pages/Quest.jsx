import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QuestCard from "../components/QuestCard";
import {
  loadQuestProgress,
  saveQuestProgress,
  saveJournalEntry,
  getOfflineMode,
} from "../services/storage";
import "../styles/quest.css";

export default function Quest() {
  // LocalStorage se quest progress restore karte hain – page refresh safe hai
  const [questData, setQuestData] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);
  const [observations, setObservations] = useState({});
  const [savedToJournal, setSavedToJournal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const saved = loadQuestProgress();
    if (saved) {
      setQuestData(saved.quest);
      setCompletedIds(saved.completedIds || []);
      setObservations(saved.observations || {});
    }
  }, []);

  // Completion aur observation update localStorage mein bhi reflect hone chahiye
  function handleComplete(challengeId) {
    const updated = [...completedIds, challengeId];
    setCompletedIds(updated);
    persistProgress(updated, observations);
  }

  function handleObservationChange(challengeId, text) {
    const updated = { ...observations, [challengeId]: text };
    setObservations(updated);
    persistProgress(completedIds, updated);
  }

  function persistProgress(ids, obs) {
    saveQuestProgress({
      quest: questData,
      completedIds: ids,
      observations: obs,
      startedAt: loadQuestProgress()?.startedAt,
    });
  }

  // Journal saving stays local; only the explicit Ask AI action sends an observation online.
  function handleSaveToJournal() {
    if (!questData) return;
    saveJournalEntry({
      questTitle: questData.quest_title,
      introduction: questData.introduction,
      isOffline: Boolean(questData.is_offline),
      completedCount: completedIds.length,
      totalCount: questData.challenges.length,
      observations: completedIds.map((id) => ({
        challengeTitle: questData.challenges.find((c) => c.id === id)?.title,
        note: observations[id] || "",
      })),
    });
    setSavedToJournal(true);
  }

  if (!questData) {
    return (
      <main className="page-content">
        <div className="container">
          <div className="quest-page__no-quest empty-state">
            <div className="empty-state__icon">🗺️</div>
            <h1 className="empty-state__title">No quest loaded</h1>
            <p className="empty-state__text">
              Head back to the home page and choose an exploration quest.
            </p>
            <button
              className="btn btn--primary"
              style={{ marginTop: "var(--space-4)" }}
              onClick={() => navigate("/")}
              id="go-home-btn"
            >
              Explore Quests
            </button>
          </div>
        </div>
      </main>
    );
  }

  const challenges = questData.challenges || [];
  const total = challenges.length;
  const completed = completedIds.length;
  const allDone = completed === total;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isOfflineQuest = Boolean(questData.is_offline || questData.source === "offline_curated");

  return (
    <main>
      {/* Hero header with quest info */}
      <div className="quest-page__header">
        <div className="container container--narrow">
          <div className="quest-page__meta" style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
            <span className="quest-page__meta-item">⏱ {questData.estimated_minutes} min</span>
            <span>·</span>
            <span className="quest-page__meta-item">🌿 {total} challenges</span>
            <span>·</span>
            {isOfflineQuest ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(34, 197, 94, 0.15)",
                  color: "var(--color-primary)",
                  fontWeight: "600",
                  fontSize: "var(--text-xs)",
                }}
              >
                🌲 Offline Curated Quest
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  color: "#2563eb",
                  fontWeight: "600",
                  fontSize: "var(--text-xs)",
                }}
              >
                🤖 AI Generated
              </span>
            )}
          </div>

          <h1 className="quest-page__title">{questData.quest_title}</h1>
          <p className="quest-page__intro">{questData.introduction}</p>

          {isOfflineQuest && (
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-muted)",
                marginTop: "var(--space-2)",
                fontStyle: "italic",
              }}
            >
              Curated field quest from the bundled offline collection (not AI-generated). Safe to explore outdoors without connectivity.
            </p>
          )}

          {questData.fallback_notice && (
            <div
              className="alert alert--info"
              role="status"
              style={{
                marginTop: "var(--space-3)",
                fontSize: "var(--text-xs)",
                padding: "var(--space-2) var(--space-3)",
              }}
            >
              ℹ️ {questData.fallback_notice}
            </div>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="container container--narrow">
          {/* Progress bar */}
          <div className="quest-progress">
            <div className="quest-progress__label">
              <span>Quest Progress</span>
              <span className="quest-progress__count">
                {completed} / {total} completed
              </span>
            </div>
            <div
              className="progress-bar"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progress-bar__fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* All challenges done – celebration banner */}
          {allDone && (
            <div className="completion-banner animate-fade-up" style={{ marginBottom: "var(--space-8)" }}>
              <span className="completion-banner__emoji">🎉</span>
              <h2 className="completion-banner__title">Quest Complete!</h2>
              <p className="completion-banner__text">
                You've completed all {total} challenges. Fantastic exploration! 
                Save your discoveries to your Field Journal.
              </p>
            </div>
          )}

          {/* Individual challenge cards */}
          <div className="quest-challenges">
            {challenges.map((challenge, index) => (
              <QuestCard
                key={challenge.id}
                challenge={challenge}
                index={index}
                questTitle={questData.quest_title}
                category={challenge.category || questData.category || questData.interests?.join(", ") || "Nature"}
                onlineEnabled={!getOfflineMode()}
                isCompleted={completedIds.includes(challenge.id)}
                observation={observations[challenge.id]}
                onComplete={handleComplete}
                onObservationChange={handleObservationChange}
                onSaveAnswer={(savedChallenge, note, aiExplanation) => {
                  saveJournalEntry({
                    questTitle: questData.quest_title,
                    introduction: questData.introduction,
                    isOffline: Boolean(questData.is_offline),
                    completedCount: completedIds.length,
                    totalCount: challenges.length,
                    observations: [{
                      challengeTitle: savedChallenge.title,
                      note,
                      aiExplanation,
                    }],
                  });
                }}
              />
            ))}
          </div>

          {/* Save section – completed quests journal mein save ho sakte hain */}
          {completed > 0 && (
            <div className="quest-save-section">
              <h3 className="quest-save-section__title">📓 Save to Field Journal</h3>
              <p className="quest-save-section__text">
                Record your {completed} completed {completed === 1 ? "discovery" : "discoveries"} in your personal journal.
                Notes stay 100% on this device in browser storage.
              </p>
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                {!savedToJournal ? (
                  <button
                    className="btn btn--primary"
                    onClick={handleSaveToJournal}
                    id="save-journal-btn"
                  >
                    Save to Journal
                  </button>
                ) : (
                  <div
                    className="badge badge--success"
                    style={{ padding: "var(--space-2) var(--space-4)", fontSize: "var(--text-sm)" }}
                  >
                    ✓ Saved to journal
                  </div>
                )}
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => navigate("/journal")}
                  id="view-journal-btn"
                >
                  View Journal
                </button>
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => navigate("/")}
                  id="new-quest-btn"
                >
                  New Quest
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
