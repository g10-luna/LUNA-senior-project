import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { USE_MOCK_AUTH } from "../lib/appEnv";
import { completePasswordRecovery, resetPasswordWithToken } from "../lib/authApi";
import { ROUTES } from "../lib/routes";
import "./LoginScreen.css";
import lunaIcon from "../assets/luna-icon.png";

type RecoveryMode =
  | { kind: "jwt"; access_token: string; refresh_token: string }
  | { kind: "token_hash"; token: string };

function parseRecoveryFromWindow(): RecoveryMode | null {
  const search = new URLSearchParams(window.location.search);
  const fromQuery = (search.get("token_hash") || search.get("token"))?.trim();
  if (fromQuery) return { kind: "token_hash", token: fromQuery };

  const raw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hash = new URLSearchParams(raw);
  const fromHash = (hash.get("token_hash") || hash.get("token"))?.trim();
  if (fromHash) return { kind: "token_hash", token: fromHash };

  const access = hash.get("access_token")?.trim();
  const refresh = hash.get("refresh_token")?.trim();
  if (access && refresh) {
    return { kind: "jwt", access_token: access, refresh_token: refresh };
  }
  return null;
}

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const recovery = useMemo(() => parseRecoveryFromWindow(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!recovery) {
      setError("This reset link is invalid or expired. Request a new one from Forgot password.");
      return;
    }
    try {
      setLoading(true);
      if (recovery.kind === "jwt") {
        await completePasswordRecovery(recovery.access_token, recovery.refresh_token, password);
      } else {
        await resetPasswordWithToken(recovery.token, password);
      }
      navigate(`${ROUTES.LOGIN}?password_reset=1`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="card login-card">
        <div className="login-header">
          <div className="login-logo-circle">
            <img src={lunaIcon} alt="LUNA" className="login-logo-img" />
          </div>
          <div className="login-header-text">
            <div className="login-app-name">LUNA</div>
            <div className="login-app-underline" />
            <div className="login-app-tagline">Choose a new password</div>
          </div>
        </div>
        {USE_MOCK_AUTH && (
          <div className="login-mock-banner" role="status">
            <strong>Dev mode:</strong> submit succeeds without calling the API. Use real auth to test email links.
          </div>
        )}
        {!recovery && (
          <div className="login-error" role="alert">
            This page should be opened from the link in your password-reset email. If the link expired, go to
            Forgot password and try again.
          </div>
        )}
        {recovery && (
          <p className="forgot-password-lead">Enter a new password for your account (at least 8 characters).</p>
        )}
        <form onSubmit={onSubmit} className="login-form">
          <label className="login-label">
            <span className="login-label-text">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading || !recovery}
              className="login-input"
              minLength={8}
              required
            />
          </label>
          <label className="login-label">
            <span className="login-label-text">Confirm password</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              disabled={loading || !recovery}
              className="login-input"
              minLength={8}
              required
            />
          </label>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading || !recovery} className="login-submit">
            {loading ? "Saving…" : "Update password →"}
          </button>
        </form>
        <div className="login-links">
          <button type="button" className="login-link login-link-button" onClick={() => navigate(ROUTES.LOGIN)}>
            ← Back to sign in
          </button>
          <button
            type="button"
            className="login-link login-link-button"
            onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
          >
            Request a new reset link
          </button>
        </div>
      </div>
    </div>
  );
}
