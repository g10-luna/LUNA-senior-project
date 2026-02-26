import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../../lib/authApi";
import { ROUTES } from "../../lib/routes";
import "./TopBar.css";

export default function TopBar({ title }: { title: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const showBack = pathname !== ROUTES.DASHBOARD;

  return (
    <div className="topbar">
      <div className="topbar-left">
        {showBack && (
          <button type="button" className="topbar-back topbar-icon" onClick={() => navigate(ROUTES.DASHBOARD)}>← Back</button>
        )}
        <h2 className="topbar-title">{title}</h2>
      </div>
      <div className="topbar-right">
        <button type="button" className="topbar-icon" onClick={() => navigate(ROUTES.OPTIONS)} title="Menu">☰</button>
        <button type="button" className="topbar-icon" title="Notifications">🔔</button>
        <button type="button" className="topbar-icon" title="Refresh">⟳</button>
        <button type="button" className="topbar-icon" onClick={() => { logout(); navigate(ROUTES.LOGIN, { replace: true }); }} title="Log out">
          Log out
        </button>
      </div>
    </div>
  );
}
