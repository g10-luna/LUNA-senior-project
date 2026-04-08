import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { USE_MOCK_AUTH } from "../lib/appEnv";
import { requestPasswordResetEmail } from "../lib/authApi";
import { ROUTES } from "../lib/routes";
import "./LoginScreen.css";
import lunaIcon from "../assets/luna-icon.png";

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      setLoading(true);
      await requestPasswordResetEmail(email);
      setSuccess(
        "If an account exists for that email, we sent a reset link. Check your inbox and spam folder."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
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
            <div className="login-app-tagline">Reset your password</div>
          </div>
        </div>
        {USE_MOCK_AUTH && (
          <div className="login-mock-banner" role="status">
            <strong>Dev mode:</strong> mock auth — no email is sent. Turn off{" "}
            <code>VITE_USE_MOCK_AUTH</code> to use real Supabase reset emails.
          </div>
        )}
        <p className="forgot-password-lead">
          Enter the email you use for LUNA. We will send a link to choose a new password.
        </p>
        <form onSubmit={onSubmit} className="login-form">
          <label className="login-label">
            <span className="login-label-text">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              autoComplete="email"
              disabled={loading}
              className="login-input"
              required
            />
          </label>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="login-success" role="status">
              {success}
            </div>
          )}
          <button type="submit" disabled={loading} className="login-submit">
            {loading ? "Sending…" : "Send reset link →"}
          </button>
        </form>
        <div className="login-links">
          <button type="button" className="login-link login-link-button" onClick={() => navigate(ROUTES.LOGIN)}>
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
