import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getJournalEntries, deleteJournalEntry } from "../services/storage";
import "../styles/journal.css";

// Saved at timestamp ko readable format mein dikhata hai
function formatDate(isoString) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return "Unknown date";
  }
}

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setEntries(getJournalEntries());
  }, []);

  function handleDelete(id) {
    deleteJournalEntry(id);
    setEntries(getJournalEntries());
  }

  const totalObservations = entries.reduce(
    (sum, e) => sum + (e.observations?.length || 0),
    0
  );

  return (
    <main className="page-content">
      <div className="container container--narrow">
        {/* Page header */}
        <div className="journal-page__header">
          <h1 className="journal-page__title">📓 Field Journal</h1>
          <p className="journal-page__subtitle">
            Your personal record of nature discoveries.
          </p>
        </div>

        {/* Stats – sirf tab dikhao jab kuch entries hain */}
        {entries.length > 0 && (
          <div className="journal-stats">
            <div className="journal-stat">
              <div className="journal-stat__value">{entries.length}</div>
              <div className="journal-stat__label">Quests Saved</div>
            </div>
            <div className="journal-stat">
              <div className="journal-stat__value">{totalObservations}</div>
              <div className="journal-stat__label">Observations</div>
            </div>
          </div>
        )}

        {/* Empty state – naye user ke liye */}
        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🍃</div>
            <h2 className="empty-state__title">Your journal is empty</h2>
            <p className="empty-state__text">
              Complete your first quest and save your discoveries here. The
              natural world is waiting for you.
            </p>
            <button
              className="btn btn--primary"
              style={{ marginTop: "var(--space-4)" }}
              onClick={() => navigate("/")}
              id="start-exploring-btn"
            >
              Start Exploring
            </button>
          </div>
        ) : (
          <div className="journal-entries">
            {entries.map((entry) => (
              <article key={entry.id} className="journal-entry">
                <div className="journal-entry__header">
                  <div>
                    <h2 className="journal-entry__quest-title">
                      {entry.questTitle}
                    </h2>
                    <p className="journal-entry__date">
                      {formatDate(entry.savedAt)}
                    </p>
                  </div>
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => handleDelete(entry.id)}
                    aria-label={`Delete journal entry: ${entry.questTitle}`}
                    id={`delete-entry-${entry.id}`}
                  >
                    Delete
                  </button>
                </div>

                {/* Completion progress */}
                <div className="journal-entry__progress" style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
                  <span className="badge badge--primary">
                    {entry.completedCount}/{entry.totalCount} completed
                  </span>
                  {entry.isOffline && (
                    <span className="badge" style={{ backgroundColor: "rgba(34, 197, 94, 0.15)", color: "var(--color-primary)", fontSize: "var(--text-xs)" }}>
                      🌲 Offline Quest
                    </span>
                  )}
                </div>

                {/* Observations list */}
                {entry.observations && entry.observations.length > 0 && (
                  <div className="journal-observations">
                    {entry.observations.map((obs, i) => (
                      <div key={i} className="journal-observation">
                        {obs.challengeTitle && (
                          <div className="journal-observation__title">
                            {obs.challengeTitle}
                          </div>
                        )}
                        {obs.note ? (
                          <p className="journal-observation__note">"{obs.note}"</p>
                        ) : (
                          <p className="journal-observation__empty">
                            No notes recorded.
                          </p>
                        )}
                        {obs.aiExplanation && (
                          <div className="journal-observation__ai">
                            <h3>Ask AI explanation</h3>
                            <p><strong>What it might be:</strong> {obs.aiExplanation.what_it_might_be}</p>
                            <p><strong>Why:</strong> {obs.aiExplanation.why_it_looks_or_behaves_that_way}</p>
                            <p><strong>Uses:</strong> {obs.aiExplanation.real_world_uses}</p>
                            <p><strong>Nature tip:</strong> {obs.aiExplanation.practical_tip}</p>
                            <p><strong>Explore next:</strong> {obs.aiExplanation.explore_next}</p>
                            <p><strong>Facts and uncertainty:</strong> {obs.aiExplanation.facts_and_uncertainty}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
