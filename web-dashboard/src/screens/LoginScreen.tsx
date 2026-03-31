import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login } from "../lib/authApi";
import { setLibrarianEmailAfterLogin } from "../lib/sessionProfile";
import { ROUTES } from "../lib/routes";
import "./LoginScreen.css";
import { loginSchema } from "../lib/loginSchema";
import lunaIcon from "../assets/luna-icon.png";

const FIELDS = [
  {
    key: "email",
    type: "email",
    label: "Librarian ID / Email",
    placeholder: "Librarian ID or email",
    autoComplete: "email" as const,
  },
  {
    key: "password",
    type: "password",
    label: "Password",
    placeholder: "Password",
    autoComplete: "current-password" as const,
  },
] as const;

export default function LoginScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("session_expired") === "1") {
      setError("Session expired — please log in again.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email: form.email, password: form.password });

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    try {
      setLoading(true);
      await login(result.data.email, result.data.password);
      setLibrarianEmailAfterLogin(result.data.email);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch {
      setError("Invalid email or password");
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
            <div className="login-app-tagline">Library utility and navigation assistant</div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="login-form">
          {FIELDS.map(({ key, type, label, placeholder, autoComplete }) => (
            <label key={key} className="login-label">
              <span className="login-label-text">{label}</span>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                autoComplete={autoComplete}
                disabled={loading}
                className="login-input"
              />
            </label>
          ))}
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" disabled={loading} className="login-submit">
            {loading ? "Signing in..." : "Login →"}
          </button>
        </form>
        <div className="login-links">
          <a
            href="#"
            className="login-link"
            onClick={(e) => {
              e.preventDefault();
            }}
          >
            Forgot Password?
          </a>
          <span className="login-signup-text">
            First time here?{" "}
            <a
              href="#"
              className="login-signup-link"
              onClick={(e) => {
                e.preventDefault();
                navigate(ROUTES.SETUP_ACCOUNT);
              }}
            >
              Set up account
            </a>
          </span>
        </div>
        <button
          type="button"
          className="login-sso-button"
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          Sign in with HU Single Sign-On (SSO)
        </button>
      </div>
    </div>
  );
}
