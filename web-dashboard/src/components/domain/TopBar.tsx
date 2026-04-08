import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { displayNameFromCurrentUser, fetchCurrentUser, logout } from "../../lib/authApi";
import { ROUTES } from "../../lib/routes";
import {
  CACHED_USER_DISPLAY_NAME_KEY,
  getLibrarianDisplayName,
  getStoredUserProfile,
  USER_PROFILE_CHANGED_EVENT,
} from "../../lib/sessionProfile";
import "./TopBar.css";

/** Logo next to the title. Put your image in web-dashboard/public/luna-logo.png (or .svg, .webp). */
const LOGO_SRC = "/luna-logo.png";

export default function TopBar({ title }: { title?: string }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState(() => {
    if (getStoredUserProfile()) {
      return getLibrarianDisplayName();
    }
    const cached = localStorage.getItem(CACHED_USER_DISPLAY_NAME_KEY);
    if (cached) return cached;
    return hasLibrarianSessionHint() ? getLibrarianDisplayName() : "Librarian";
  });

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      const user = await fetchCurrentUser();
      if (cancelled) return;
      if (user) {
        const nextName = displayNameFromCurrentUser(user) || getLibrarianDisplayName();
        setUserDisplayName(nextName);
        localStorage.setItem(CACHED_USER_DISPLAY_NAME_KEY, nextName);
        return;
      }
      if (hasLibrarianSessionHint()) {
        setUserDisplayName(getLibrarianDisplayName());
      }
    };

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncNameFromSession = () => {
      const nextName = getLibrarianDisplayName();
      setUserDisplayName(nextName);
      localStorage.setItem(CACHED_USER_DISPLAY_NAME_KEY, nextName);
    };
    window.addEventListener(USER_PROFILE_CHANGED_EVENT, syncNameFromSession);
    return () => {
      window.removeEventListener(USER_PROFILE_CHANGED_EVENT, syncNameFromSession);
    };
  }, []);

  const avatarLetter = useMemo(
    () => (userDisplayName.trim().charAt(0) || "L").toUpperCase(),
    [userDisplayName]
  );

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(ROUTES.CATALOG + `?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-logo topbar-logo-btn"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          aria-label="Go to dashboard"
        >
          {!logoError && (
            <img
              src={LOGO_SRC}
              alt=""
              className="topbar-logo-img"
              onError={() => setLogoError(true)}
            />
          )}
          {logoError && (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="topbar-logo-icon">
              <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M4 14h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M4 18h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        <div className="topbar-brand">
          <span className="topbar-brand-university">LUNA</span>
          <span className="topbar-brand-sub">{title || "Library Administration"}</span>
        </div>
      </div>

      <form className="topbar-search-wrap" onSubmit={handleSearch} role="search">
        <span className="topbar-search-icon-left" aria-hidden>🔍</span>
        <input
          type="search"
          className="topbar-search"
          placeholder="Search books, collections, users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search books, collections, users"
        />
        <button type="submit" className="topbar-search-btn" aria-label="Search">
          <span className="topbar-search-icon-right" aria-hidden>🔍</span>
        </button>
      </form>

      <div className="topbar-right">
        <div className="topbar-profile-wrap">
          <button
            type="button"
            className="topbar-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-expanded={profileOpen}
            aria-haspopup="true"
            aria-label="User menu"
          >
            <span className="topbar-avatar" aria-hidden>
              {avatarLetter}
            </span>
            <span className="topbar-profile-name">{userDisplayName}</span>
            <span className="topbar-profile-chevron" aria-hidden>▼</span>
          </button>
          {profileOpen && (
            <>
              <div className="topbar-profile-backdrop" onClick={() => setProfileOpen(false)} aria-hidden />
              <div className="topbar-profile-dropdown" role="menu">
                <button type="button" className="topbar-dropdown-item" onClick={() => { setProfileOpen(false); navigate(ROUTES.OPTIONS); }} role="menuitem">Options</button>
                <button type="button" className="topbar-dropdown-item" onClick={() => { setProfileOpen(false); navigate(ROUTES.ACCOUNT); }} role="menuitem">Account Settings</button>
                <button
                  type="button"
                  className="topbar-dropdown-item topbar-dropdown-logout"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                    localStorage.removeItem(CACHED_USER_DISPLAY_NAME_KEY);
                    navigate(ROUTES.LOGIN, { replace: true });
                  }}
                  role="menuitem"
                >
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
