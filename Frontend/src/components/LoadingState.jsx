// Jab quest load ya generate ho raha ho tab yeh dikhta hai
export default function LoadingState() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-state__leaf" aria-hidden="true">🌿</div>
      <div className="loading-state__spinner" aria-label="Loading" />
      <p className="loading-state__title">Preparing your quest…</p>
      <p className="loading-state__subtitle">
        WildWise is crafting personalized challenges for your outdoor adventure.
      </p>
    </div>
  );
}
