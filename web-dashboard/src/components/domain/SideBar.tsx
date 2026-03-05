import { NavLink, useNavigate } from "react-router-dom";
import { ROUTES } from "../../lib/routes";
import "./Sidebar.css";

const LOGO_SRC = "/luna-logo.png";

const navItems = [
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: "📊" },
  { to: ROUTES.CATALOG, label: "Library Catalog", icon: "📚" },
  { to: ROUTES.MAINTENANCE, label: "Robot Maintenance", icon: "🔧" },
  { to: ROUTES.MAP, label: "Map", icon: "🗺️" },
  { to: ROUTES.OPTIONS, label: "Options", icon: "⚙️" },
  { to: ROUTES.ACCOUNT, label: "Settings", icon: "👤" },
] as const;

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button
          type="button"
          className="sidebar-logo-btn"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          aria-label="Go to dashboard"
        >
          <img src={LOGO_SRC} alt="" className="sidebar-logo-img" />
        </button>
        <div className="sidebar-brand">
          <span className="sidebar-brand-title">LUNA</span>
          <span className="sidebar-brand-sub">Library Administration</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
            }
            end={to === ROUTES.DASHBOARD}
          >
            <span className="sidebar-link-icon" aria-hidden>{icon}</span>
            <span className="sidebar-link-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <a href="#help" className="sidebar-link sidebar-link-help">
          <span className="sidebar-link-icon" aria-hidden>📍</span>
          <span className="sidebar-link-label">Help & Support</span>
        </a>
      </div>
    </aside>
  );
}
