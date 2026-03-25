import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginScreen.css";
import { ROUTES } from "../lib/routes";
import { registerAccount } from "../lib/authApi";
import { IconTextInput } from "../components/forms/IconTextInput";

type SetupFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export default function SetupAccountScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SetupFormState>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const onChange =
    (key: keyof SetupFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Please enter your email or librarian ID.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await registerAccount({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      });
      setRegisteredEmail(form.email.trim());
      setForm((p) => ({
        ...p,
        password: "",
        confirmPassword: "",
      }));
      setSuccessOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    setSuccessOpen(false);
    setRegisteredEmail("");
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });
    navigate(ROUTES.LOGIN);
  };

  useEffect(() => {
    if (!successOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSuccessOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [successOpen]);

  return (
    <div className="login-screen">
      {successOpen && (
        <div className="setup-success-overlay" role="presentation" onClick={() => setSuccessOpen(false)}>
          <div
            className="setup-success-dialog card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-success-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="setup-success-title" className="setup-success-title">
              Account created
            </h2>
            <p className="setup-success-body">
              Your LUNA account is ready. Use the email and password you just entered to sign in on the login screen.
            </p>
            {registeredEmail && (
              <p className="setup-success-email">
                <span className="setup-success-email-label">Email</span>
                <span className="setup-success-email-value">{registeredEmail}</span>
              </p>
            )}
            <button type="button" className="login-submit setup-success-primary" onClick={goToLogin}>
              Go to sign in
            </button>
          </div>
        </div>
      )}
      <div className="card login-card">
        <button type="button" className="setup-back-button" onClick={() => navigate(ROUTES.LOGIN)}>
          Back
        </button>
        <h1 className="login-title setup-title">Set up account</h1>
        <p className="login-subtitle setup-subtitle">Create your LUNA librarian account.</p>
        <form onSubmit={onSubmit} className="login-form">
          <IconTextInput
            type="text"
            value={form.firstName}
            onChange={onChange("firstName")}
            placeholder="First name"
            autoComplete="given-name"
            disabled={loading}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M6 18.5C6.8 15.5 9.1 14 12 14C14.9 14 17.2 15.5 18 18.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          <IconTextInput
            type="text"
            value={form.lastName}
            onChange={onChange("lastName")}
            placeholder="Last name"
            autoComplete="family-name"
            disabled={loading}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M6 18.5C6.8 15.5 9.1 14 12 14C14.9 14 17.2 15.5 18 18.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          <IconTextInput
            type="email"
            value={form.email}
            onChange={onChange("email")}
            placeholder="Email (Librarian ID / university email)"
            autoComplete="email"
            disabled={loading}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect
                  x="3.5"
                  y="5.5"
                  width="17"
                  height="13"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M5 8L10.5 11.5C11.4 12.1 12.6 12.1 13.5 11.5L19 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          <IconTextInput
            type="tel"
            value={form.phone}
            onChange={onChange("phone")}
            placeholder="Phone (optional)"
            autoComplete="tel"
            disabled={loading}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8.5 3.5H7C5.6 3.5 4.5 4.6 4.5 6V7.2C4.5 11.9 8.1 15.5 12.8 15.5H14C15.4 15.5 16.5 14.4 16.5 13V11.9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="16.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            }
          />
          <IconTextInput
            type="password"
            value={form.password}
            onChange={onChange("password")}
            placeholder="Password (min 8 characters)"
            autoComplete="new-password"
            disabled={loading}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="9"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M9 10V8C9 5.8 10.6 4 12.5 4C14.4 4 16 5.8 16 8V10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          <IconTextInput
            type="password"
            value={form.confirmPassword}
            onChange={onChange("confirmPassword")}
            placeholder="Confirm password"
            autoComplete="new-password"
            disabled={loading}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="9"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M9 10V8C9 5.8 10.6 4 12.5 4C14.4 4 16 5.8 16 8V10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="login-submit">
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <div className="login-links setup-footer">
          <span className="login-signup-text">
            Already have an account?{" "}
            <button
              type="button"
              className="login-signup-link setup-inline-button"
              onClick={() => navigate(ROUTES.LOGIN)}
            >
              Sign in
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

