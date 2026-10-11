import { NavLink } from "react-router-dom";

// Top navigation bar – branding aur page links
export default function Navbar() {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <NavLink to="/" className="navbar__brand">
        <span className="navbar__logo" aria-hidden="true">🌿</span>
        <span className="navbar__name">WildWise</span>
        <span
          style={{
            fontSize: "0.7rem",
            backgroundColor: "rgba(34, 197, 94, 0.15)",
            color: "var(--color-primary)",
            padding: "2px 6px",
            borderRadius: "6px",
            marginLeft: "6px",
            fontWeight: "600",
          }}
        >
          Offline-Ready
        </span>
      </NavLink>

      <div className="navbar__nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `navbar__link${isActive ? " navbar__link--active" : ""}`
          }
        >
          Explore
        </NavLink>
        <NavLink
          to="/journal"
          className={({ isActive }) =>
            `navbar__link${isActive ? " navbar__link--active" : ""}`
          }
        >
          Journal
        </NavLink>
      </div>
    </nav>
  );
}
