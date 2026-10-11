import { useState } from "react";
import { explainObservation } from "../services/api";

export default function QuestCard({
  challenge,
  index,
  questTitle,
  category,
  onlineEnabled,
  isCompleted,
  observation,
  onComplete,
  onObservationChange,
  onSaveAnswer,
}) {
  const [answer, setAnswer] = useState(null);
  const [answerError, setAnswerError] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [needsObservation, setNeedsObservation] = useState(false);
  const [answerSaved, setAnswerSaved] = useState(false);

  async function handleAskAI() {
    const text = (observation || "").trim();
    if (!text) {
      setNeedsObservation(true);
      document.getElementById(`obs-${challenge.id}`)?.focus();
      return;
    }

    setNeedsObservation(false);
    setAnswerError("");
    if (!onlineEnabled) {
      setAnswerError("AI learning requires online mode. Turn off Offline Mode to continue.");
      return;
    }

    setIsAsking(true);
    setAnswerSaved(false);
    try {
      const explanation = await explainObservation({
        quest_title: questTitle,
        instruction: challenge.instruction,
        category,
        observation: text,
      });
      setAnswer(explanation);
    } catch (error) {
      setAnswerError(error.message || "Online AI is unavailable. Please retry.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div
      className={`quest-card animate-fade-up animate-fade-up--delay-${Math.min(index, 3)}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="quest-card__header">
        <div className="quest-card__number" aria-label={`Challenge ${index + 1}`}>
          {isCompleted ? "✓" : index + 1}
        </div>
        <h3 className="quest-card__title">{challenge.title}</h3>
      </div>

      <p className="quest-card__instruction">{challenge.instruction}</p>

      <div className="quest-card__fact">
        <span className="quest-card__fact-label">🌱 Nature Fact:</span>
        {challenge.fact}
      </div>

      {/* Observation field – user ka field journal entry */}
      <div className="quest-card__observation">
        <label
          htmlFor={`obs-${challenge.id}`}
          className="form-label"
          style={{ marginBottom: "var(--space-2)", display: "block" }}
        >
          My Observation
          <span className="form-label__hint">(optional)</span>
        </label>
        <textarea
          id={`obs-${challenge.id}`}
          value={observation || ""}
          onChange={(e) => onObservationChange(challenge.id, e.target.value)}
          placeholder="What did you notice, feel, or discover?"
          disabled={isCompleted && !needsObservation}
          aria-describedby={needsObservation ? `obs-required-${challenge.id}` : undefined}
        />
        {needsObservation && (
          <p className="quest-card__input-hint" id={`obs-required-${challenge.id}`} role="alert">
            Describe what you noticed before asking AI.
          </p>
        )}
      </div>

      <div className="quest-card__actions">
        {!isCompleted ? (
          <button
            className="btn btn--primary btn--sm"
            onClick={() => onComplete(challenge.id)}
            id={`complete-challenge-${challenge.id}`}
          >
            Mark Complete ✓
          </button>
        ) : (
          <div className="badge badge--success">Completed</div>
        )}
        <button
          className="btn btn--secondary btn--sm"
          onClick={handleAskAI}
          disabled={isAsking}
          id={`ask-ai-${challenge.id}`}
        >
          {isAsking ? "Asking AI..." : answerError ? "Retry Ask AI" : "Ask AI"}
        </button>
      </div>

      {isAsking && <p className="quest-card__ai-status" role="status">Preparing an explanation from your observation...</p>}
      {answerError && <p className="quest-card__ai-error" role="alert">{answerError}</p>}
      {answer && (
        <section className="quest-card__ai-answer" aria-label="AI explanation">
          <h4>What it might be</h4>
          <p>{answer.what_it_might_be}</p>
          <h4>Why it looks or behaves this way</h4>
          <p>{answer.why_it_looks_or_behaves_that_way}</p>
          <h4>Uses and applications</h4>
          <p>{answer.real_world_uses}</p>
          <h4>Practical nature tip</h4>
          <p>{answer.practical_tip}</p>
          <h4>Explore next</h4>
          <p>{answer.explore_next}</p>
          <p className="quest-card__ai-caution"><strong>Facts and uncertainty:</strong> {answer.facts_and_uncertainty}</p>
          <div className="quest-card__answer-actions">
            {answerSaved ? (
              <span className="badge badge--success" role="status">Saved to Field Journal</span>
            ) : (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  onSaveAnswer(challenge, observation || "", answer);
                  setAnswerSaved(true);
                }}
              >
                Save answer to journal
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
