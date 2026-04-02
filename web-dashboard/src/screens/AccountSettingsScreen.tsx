import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changePassword,
  displayNameFromCurrentUser,
  fetchCurrentUser,
  logout,
  requestPasswordResetEmail,
  type CurrentUser,
} from "../lib/authApi";
import { ROUTES } from "../lib/routes";
import {
  DEMO_LIBRARIAN_FIRST_NAME,
  DEMO_LIBRARIAN_LAST_NAME,
  getLibrarianDisplayEmail,
  getLibrarianDisplayName,
} from "../lib/sessionProfile";
import "./Dashboard.css";
import "./AccountSettingsScreen.css";

const WORKSPACE = {
  library: "Howard University Libraries",
  site: "Founders Library",
  department: "Circulation & access services",
  cityRegion: "Washington, DC",
  country: "United States",
  postalCode: "20059",
} as const;

type AccountSection = "profile" | "security";

function formatRoleLabel(role: string | undefined): string {
  if (!role) return "Librarian";
  return role
    .toLowerCase()
    .split("_")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="account-info-cell">
      <span className="account-info-label">{label}</span>
      <span className="account-info-value">{value}</span>
    </div>
  );
}

export default function AccountSettingsScreen() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      try {
        const user = await fetchCurrentUser();
        if (!cancelled) setProfile(user);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = useMemo(() => {
    if (profile) {
      const fromApi = displayNameFromCurrentUser(profile);
      if (fromApi) return fromApi;
    }
    return getLibrarianDisplayName();
  }, [profile]);

  const email =
    profile?.email?.trim() || (profileLoading ? "…" : getLibrarianDisplayEmail());
  const firstName =
    profile?.first_name?.trim() || (profileLoading ? "…" : DEMO_LIBRARIAN_FIRST_NAME);
  const lastName =
    profile?.last_name?.trim() || (profileLoading ? "…" : DEMO_LIBRARIAN_LAST_NAME);
  const staffId = useMemo(() => {
    const e = profile?.email?.trim() || getLibrarianDisplayEmail();
    return e.includes("@") ? e.split("@")[0]! : e || "—";
  }, [profile?.email]);
  const roleLabel = formatRoleLabel(profile?.role);

  const [section, setSection] = useState<AccountSection>("profile");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);

  const [resetEmail, setResetEmail] = useState(email);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (email !== "…") setResetEmail(email);
  }, [email]);

  const initial = (displayName.charAt(0) || "?").toUpperCase();

  const handleSignOut = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(null);
    if (newPassword !== confirmPassword) {
      setChangeError("New password and confirmation do not match.");
      return;
    }
    try {
      setChangeLoading(true);
      await changePassword(currentPassword, newPassword);
      setChangeSuccess("Password updated. Use your new password next time you sign in.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setChangeError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setChangeLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);
    try {
      setResetLoading(true);
      await requestPasswordResetEmail(resetEmail);
      setResetSuccess(
        "If an account exists for that email, a password reset link has been sent. Check your inbox."
      );
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="dashboard-page account-page account-page--settings">
      <div className="account-shell">
        <aside className="account-aside" aria-label="Account sections">
          <p className="account-aside-label">Settings</p>
          <nav className="account-aside-nav">
            <button
              type="button"
              className={`account-nav-item${section === "profile" ? " account-nav-item--active" : ""}`}
              onClick={() => setSection("profile")}
            >
              My profile
            </button>
            <button
              type="button"
              className={`account-nav-item${section === "security" ? " account-nav-item--active" : ""}`}
              onClick={() => setSection("security")}
            >
              Security
            </button>
          </nav>
          <button type="button" className="account-nav-signout" onClick={handleSignOut}>
            Sign out
          </button>
        </aside>

        <div className="account-main">
          {section === "profile" && (
            <>
              <h1 className="account-main-title">My profile</h1>

              <section className="card account-panel">
                <div className="account-hero">
                  <div className="account-hero-avatar" aria-hidden>
                    {initial}
                  </div>
                  <div className="account-hero-text">
                    <h2 className="account-hero-name">{displayName}</h2>
                    <p className="account-hero-role">{profileLoading ? "…" : roleLabel}</p>
                    <p className="account-hero-meta">
                      {WORKSPACE.site} · {WORKSPACE.cityRegion}
                    </p>
                  </div>
                </div>
              </section>

              <section className="card account-panel">
                <div className="account-panel-head">
                  <h2 className="account-panel-title">Personal information</h2>
                </div>
                <div className="account-info-grid">
                  <InfoCell label="First name" value={firstName} />
                  <InfoCell label="Last name" value={lastName} />
                  <InfoCell label="Email address" value={email} />
                  <InfoCell label="Staff sign-in ID" value={staffId} />
                  {profile?.phone_number ? (
                    <InfoCell label="Phone" value={profile.phone_number} />
                  ) : null}
                  <div className="account-info-cell account-info-cell--full">
                    <span className="account-info-label">Role</span>
                    <span className="account-info-value">{profileLoading ? "…" : roleLabel}</span>
                  </div>
                  <div className="account-info-cell account-info-cell--full">
                    <span className="account-info-label">Team</span>
                    <span className="account-info-value">{WORKSPACE.department}</span>
                  </div>
                </div>
              </section>

              <section className="card account-panel">
                <div className="account-panel-head">
                  <h2 className="account-panel-title">Library site</h2>
                </div>
                <div className="account-info-grid">
                  <InfoCell label="Country" value={WORKSPACE.country} />
                  <InfoCell label="City / region" value={WORKSPACE.cityRegion} />
                  <InfoCell label="Postal code" value={WORKSPACE.postalCode} />
                  <InfoCell label="Library" value={WORKSPACE.library} />
                  <InfoCell label="Building / site" value={WORKSPACE.site} />
                </div>
              </section>
            </>
          )}

          {section === "security" && (
            <>
              <h1 className="account-main-title">Security</h1>

              <section className="card account-panel">
                <div className="account-panel-head">
                  <h2 className="account-panel-title">Change password</h2>
                </div>
                <p className="account-form-hint">
                  Enter your current password, then choose a new one (at least 8 characters).
                </p>
                <form className="account-password-form" onSubmit={handleChangePassword}>
                  <label className="account-input-label">
                    <span>Current password</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(ev) => setCurrentPassword(ev.target.value)}
                      className="account-input"
                      required
                    />
                  </label>
                  <label className="account-input-label">
                    <span>New password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(ev) => setNewPassword(ev.target.value)}
                      className="account-input"
                      required
                      minLength={8}
                    />
                  </label>
                  <label className="account-input-label">
                    <span>Confirm new password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(ev) => setConfirmPassword(ev.target.value)}
                      className="account-input"
                      required
                      minLength={8}
                    />
                  </label>
                  {changeError && (
                    <p className="account-form-message account-form-message--error">{changeError}</p>
                  )}
                  {changeSuccess && (
                    <p className="account-form-message account-form-message--ok">{changeSuccess}</p>
                  )}
                  <button type="submit" className="account-primary-btn" disabled={changeLoading}>
                    {changeLoading ? "Updating…" : "Update password"}
                  </button>
                </form>
              </section>

              <section className="card account-panel">
                <div className="account-panel-head">
                  <h2 className="account-panel-title">Reset password by email</h2>
                </div>
                <p className="account-form-hint">
                  Forgot your password? We will email a reset link to the address below. The same message is shown
                  whether or not an account exists.
                </p>
                <form className="account-password-form" onSubmit={handleResetRequest}>
                  <label className="account-input-label">
                    <span>Email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={resetEmail}
                      onChange={(ev) => setResetEmail(ev.target.value)}
                      className="account-input"
                      required
                    />
                  </label>
                  {resetError && <p className="account-form-message account-form-message--error">{resetError}</p>}
                  {resetSuccess && <p className="account-form-message account-form-message--ok">{resetSuccess}</p>}
                  <button type="submit" className="account-secondary-btn" disabled={resetLoading}>
                    {resetLoading ? "Sending…" : "Send reset link"}
                  </button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
