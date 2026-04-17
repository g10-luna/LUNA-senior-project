import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import { getLibrarianGreetingFirstName } from "../lib/sessionProfile";
import { ROUTES } from "../lib/routes";
import { useRobotStatus } from "../lib/useRobotStatus";
import { registerAccount } from "../lib/authApi";

const mockDashboard = {
  totalBooks: 2487,
  availableBooks: 1894,
  checkedOutBooks: 420,
  reservedBooks: 173,
  todaysActivity: {
    issued: 32,
    returns: 14,
    newMembers: 7,
    requests: 3,
  },
  recentActivity: [
    { title: "Dandelion Wine", description: "returned", timeAgo: "2 min ago" },
    { title: "New member: Jordan Lee", description: "registered", timeAgo: "1 hour ago" },
    { title: "1984 issued to A. Johnson", description: "loaned", timeAgo: "3 hours ago" },
    { title: "Report generated", description: "circulation summary", timeAgo: "5 hours ago" },
  ],
};

export default function DashboardScreen() {
  const navigate = useNavigate();
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "STUDENT" as "STUDENT" | "LIBRARIAN",
  });
  const { statuses } = useRobotStatus();
  const robot = statuses?.[0] ?? null;
  const greetingFirstName = getLibrarianGreetingFirstName();
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date());
  const {
    totalBooks,
    availableBooks,
    checkedOutBooks,
    reservedBooks,
  } = mockDashboard;

  const totalForChart =
    totalBooks && totalBooks > 0
      ? totalBooks
      : availableBooks + checkedOutBooks + reservedBooks;

  const availablePct = (availableBooks / totalForChart) * 100;
  const checkedOutPct = (checkedOutBooks / totalForChart) * 100;
  
  // SVG Donut Chart Logic (Lovable UI Extension)
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  
  const availableDash = (availablePct / 100) * circumference;
  const checkedOutDash = (checkedOutPct / 100) * circumference;
  
  const availableOffset = 0;
  const checkedOutOffset = -availableDash;
  const reservedOffset = -(availableDash + checkedOutDash);
  const currentTask =
    robot?.currentTaskSummary?.trim() || "Charging";
  const battery = robot?.batteryPercent ?? 90;
  const currentLocation = robot?.locationLabel ?? "Dock";
  const syncDelayMinutes = mockDashboard.todaysActivity.requests >= 3 ? 12 : 4;
  const syncAlertMinsAgo = 6;

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#task-queue") {
      setActivityModalOpen(true);
    }
    if (hash === "#register-member") {
      setRegisterModalOpen(true);
    }
  }, []);

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);

    if (!registerForm.firstName.trim() || !registerForm.lastName.trim()) {
      setRegisterError("Please enter first and last name.");
      return;
    }
    if (!registerForm.email.trim()) {
      setRegisterError("Please enter an email.");
      return;
    }
    if (registerForm.password.length < 8) {
      setRegisterError("Password must be at least 8 characters.");
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError("Passwords do not match.");
      return;
    }

    try {
      setRegisterLoading(true);
      await registerAccount({
        email: registerForm.email,
        password: registerForm.password,
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
        phone: registerForm.phone,
        role: registerForm.role,
      });
      setRegisterSuccess(
        `${registerForm.role === "LIBRARIAN" ? "Librarian" : "Student"} account created for ${registerForm.email.trim()}.`
      );
      setRegisterForm((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Unable to register member.");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-heading">
          <div className="dashboard-greeting">
            Good morning, <span className="dashboard-greeting-strong">{greetingFirstName}</span>
          </div>
          <p className="dashboard-subtitle">
            Welcome back to LUNA — Howard University Library.
          </p>
        </div>
        <button type="button" className="dashboard-date-btn">
          <span className="dashboard-date-icon" aria-hidden>📅</span>
          <span>Today, {todayLabel}</span>
        </button>
      </header>

      <section className="dashboard-main-grid">
        <div className="card">
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">System Status</h2>
            <button type="button" className="dashboard-card-link" onClick={() => navigate(ROUTES.MAINTENANCE)} >
              View details →
            </button>
          </div>
          <div className="dashboard-system-pills">
            <div className="dashboard-pill">
              <span className="dashboard-pill-dot green" />
              <div>
                <div className="dashboard-pill-label-strong">Catalog</div>
                <div className="dashboard-pill-label-sub">Online</div>
              </div>
            </div>
            <div className="dashboard-pill">
              <span className="dashboard-pill-dot green" />
              <div>
                <div className="dashboard-pill-label-strong">Members</div>
                <div className="dashboard-pill-label-sub">Active</div>
              </div>
            </div>
            <div className="dashboard-pill dashboard-pill--live">
              <span className="pulse-dot" />
              <div>
                <div className="dashboard-pill-label-strong">Robot Live</div>
                <div className="dashboard-pill-label-sub">{robot?.currentTaskSummary ? 'Executing operations' : 'Running mock tasks'}</div>
              </div>
            </div>
          </div>
          <div className="dashboard-robot-quick-status">
            <div className="dashboard-robot-quick-title">Robot Snapshot</div>
            <div className="dashboard-robot-quick-row">
              <span>Current task</span>
              <strong className="dashboard-robot-value-green">{currentTask}</strong>
            </div>
            <div className="dashboard-robot-quick-row">
              <span>Battery</span>
              <strong className="dashboard-robot-value-green">{battery}%</strong>
            </div>
            <div className="dashboard-robot-quick-row">
              <span>Current location</span>
              <strong>{currentLocation}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">Today&apos;s Activity</h2>
          </div>
          <div className="dashboard-activity-grid">
            <div className="dashboard-activity-item">
              <span className="dashboard-activity-label">Books Issued</span>
              <span className="dashboard-activity-value">{mockDashboard.todaysActivity.issued}</span>
              <span className="dashboard-activity-sub">so far today</span>
            </div>
            <div className="dashboard-activity-item">
              <span className="dashboard-activity-label">Returns</span>
              <span className="dashboard-activity-value">{mockDashboard.todaysActivity.returns}</span>
              <span className="dashboard-activity-sub">checked in</span>
            </div>
            <div className="dashboard-activity-item">
              <span className="dashboard-activity-label">New Members</span>
              <span className="dashboard-activity-value">{mockDashboard.todaysActivity.newMembers}</span>
              <span className="dashboard-activity-sub">joined</span>
            </div>
          </div>
          <div className="dashboard-alerts">
            <div className="dashboard-alerts-title">Alerts</div>
            <div className="dashboard-alert-row">
              <span className="dashboard-alert-icon" aria-hidden>🟡</span>
              <span>System sync delayed ({syncDelayMinutes} min)</span>
              <span className="dashboard-alert-time">{syncAlertMinsAgo} min ago</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">Quick Actions</h2>
          </div>
          <div className="dashboard-quick-actions">
            <button
              type="button"
              className="dashboard-quick-button"
              onClick={() => navigate(`${ROUTES.CATALOG}?add=1`)}
            >
              <span className="dashboard-quick-button-label">
                <span className="dashboard-quick-button-icon" aria-hidden>📚</span>
                <span>Add Book</span>
              </span>
              <span className="dashboard-quick-button-plus">＋</span>
            </button>
            <button
              type="button"
              className="dashboard-quick-button"
              onClick={() => setRegisterModalOpen(true)}
            >
              <span className="dashboard-quick-button-label">
                <span className="dashboard-quick-button-icon" aria-hidden>👤</span>
                <span>Register Member</span>
              </span>
              <span className="dashboard-quick-button-plus">＋</span>
            </button>
            <button
              type="button"
              className="dashboard-quick-button"
              onClick={() => navigate(`${ROUTES.REQUESTS}#queue`)}
            >
              <span className="dashboard-quick-button-label">
                <span className="dashboard-quick-button-icon" aria-hidden>🧾</span>
                <span>View Task Queue</span>
              </span>
              <span className="dashboard-quick-button-plus">＋</span>
            </button>
            <button
              type="button"
              className="dashboard-quick-button"
              onClick={() => navigate(`${ROUTES.MAINTENANCE}#maintenance-report`)}
            >
              <span className="dashboard-quick-button-label">
                <span className="dashboard-quick-button-icon" aria-hidden>📊</span>
                <span>Generate Report</span>
              </span>
              <span className="dashboard-quick-button-plus">＋</span>
            </button>
          </div>
        </div>
      </section>

      <section className="dashboard-lower-grid">
        <div className="card">
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">Recent Activity</h2>
            <button
              type="button"
              className="dashboard-card-link"
              onClick={() => setActivityModalOpen(true)}
            >
              View all →
            </button>
          </div>
          <ul className="dashboard-recent-list">
            {mockDashboard.recentActivity.map((item) => (
              <li key={item.title} className="dashboard-recent-item">
                <div className="dashboard-recent-main">
                  <span className="dashboard-recent-title">{item.title}</span>
                  <span className="dashboard-recent-meta">{item.description}</span>
                </div>
                <span className="dashboard-recent-time">{item.timeAgo}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">Book Inventory</h2>
          </div>
          <div className="dashboard-inventory">
            <div
              className="dashboard-inventory-chart-modern"
              aria-hidden
            >
              <svg width="140" height="140" viewBox="0 0 140 140" className="dashboard-donut-svg">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#38a169"
                  strokeWidth="12"
                  strokeDasharray={`${availableDash} ${circumference}`}
                  strokeDashoffset={availableOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                  className="dashboard-donut-segment dashboard-donut-available"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#e53e3e"
                  strokeWidth="12"
                  strokeDasharray={`${checkedOutDash} ${circumference}`}
                  strokeDashoffset={checkedOutOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                  className="dashboard-donut-segment dashboard-donut-checkedout"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#3182ce"
                  strokeWidth="12"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={reservedOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                  className="dashboard-donut-segment dashboard-donut-reserved"
                />
              </svg>
              <div className="dashboard-inventory-chart-inner">
                <div className="dashboard-inventory-total">
                  {totalBooks.toLocaleString()}
                </div>
                <div className="dashboard-inventory-total-label">Total Books</div>
              </div>
            </div>
            <div className="dashboard-inventory-metrics" aria-label="Book inventory breakdown">
              <div className="dashboard-inventory-item dashboard-inventory-item--available">
                <span className="dashboard-inventory-label">
                  <span className="dashboard-inventory-dot available" style={{ background: '#38a169' }} /> Available
                </span>
                <span className="dashboard-inventory-value">{availableBooks}</span>
              </div>

              <div className="dashboard-inventory-item dashboard-inventory-item--checkedout">
                <span className="dashboard-inventory-label">
                  <span className="dashboard-inventory-dot checkedout" /> Checked Out
                </span>
                <span className="dashboard-inventory-value">{checkedOutBooks}</span>
              </div>

              <div className="dashboard-inventory-item dashboard-inventory-item--reserved">
                <span className="dashboard-inventory-label">
                  <span className="dashboard-inventory-dot reserved" /> Reserved
                </span>
                <span className="dashboard-inventory-value">{reservedBooks}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">Upcoming</h2>
          </div>
          <ul className="dashboard-upcoming-list">
            <li className="dashboard-upcoming-item">
              <div className="dashboard-upcoming-label">System Backup</div>
              <div className="dashboard-upcoming-meta">Tonight, 2 AM</div>
            </li>
            <li className="dashboard-upcoming-item">
              <div className="dashboard-upcoming-label">New Arrivals</div>
              <div className="dashboard-upcoming-meta">Friday</div>
            </li>
            <li className="dashboard-upcoming-item">
              <div className="dashboard-upcoming-label">Robot Maintenance Window</div>
              <div className="dashboard-upcoming-meta">Next Tuesday</div>
            </li>
          </ul>
        </div>
      </section>

      {activityModalOpen && (
        <div
          className="dashboard-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setActivityModalOpen(false);
          }}
        >
          <div className="dashboard-modal">
            <div className="dashboard-modal-header">
              <h2 className="dashboard-modal-title">Task Queue & Recent Activity</h2>
              <button
                type="button"
                className="dashboard-modal-danger-btn"
                onClick={() => setActivityModalOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="dashboard-modal-summary">
              <div><strong>Current task:</strong> {currentTask}</div>
              <div><strong>Battery:</strong> {battery}%</div>
              <div><strong>Location:</strong> {currentLocation}</div>
            </div>

            <ul className="dashboard-modal-list">
              {mockDashboard.recentActivity.map((item) => (
                <li key={`${item.title}-${item.timeAgo}`} className="dashboard-modal-list-item">
                  <div className="dashboard-recent-main">
                    <span className="dashboard-recent-title">{item.title}</span>
                    <span className="dashboard-recent-meta">{item.description}</span>
                  </div>
                  <span className="dashboard-recent-time">{item.timeAgo}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {registerModalOpen && (
        <div
          className="dashboard-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRegisterModalOpen(false);
          }}
        >
          <div className="dashboard-modal dashboard-modal--form">
            <div className="dashboard-modal-header">
              <h2 className="dashboard-modal-title">Register Member</h2>
              <button
                type="button"
                className="dashboard-modal-danger-btn"
                onClick={() => setRegisterModalOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="dashboard-register-form" onSubmit={handleRegisterMember}>
              <label className="dashboard-register-label">
                First name
                <input
                  className="dashboard-register-input"
                  value={registerForm.firstName}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, firstName: e.target.value }))}
                  disabled={registerLoading}
                />
              </label>
              <label className="dashboard-register-label">
                Last name
                <input
                  className="dashboard-register-input"
                  value={registerForm.lastName}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, lastName: e.target.value }))}
                  disabled={registerLoading}
                />
              </label>
              <label className="dashboard-register-label">
                Email
                <input
                  className="dashboard-register-input"
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                  disabled={registerLoading}
                />
              </label>
              <label className="dashboard-register-label">
                Phone (optional)
                <input
                  className="dashboard-register-input"
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, phone: e.target.value }))}
                  disabled={registerLoading}
                />
              </label>
              <label className="dashboard-register-label">
                Role
                <select
                  className="dashboard-register-input"
                  value={registerForm.role}
                  onChange={(e) =>
                    setRegisterForm((p) => ({
                      ...p,
                      role: e.target.value === "LIBRARIAN" ? "LIBRARIAN" : "STUDENT",
                    }))
                  }
                  disabled={registerLoading}
                >
                  <option value="STUDENT">Student</option>
                  <option value="LIBRARIAN">Librarian</option>
                </select>
              </label>
              <label className="dashboard-register-label">
                Password
                <input
                  className="dashboard-register-input"
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                  disabled={registerLoading}
                />
              </label>
              <label className="dashboard-register-label">
                Confirm password
                <input
                  className="dashboard-register-input"
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  disabled={registerLoading}
                />
              </label>

              {registerError && <div className="dashboard-register-error">{registerError}</div>}
              {registerSuccess && <div className="dashboard-register-success">{registerSuccess}</div>}

              <div className="dashboard-modal-actions">
                <button
                  type="button"
                  className="dashboard-modal-danger-btn"
                  onClick={() => setRegisterModalOpen(false)}
                  disabled={registerLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="dashboard-register-submit" disabled={registerLoading}>
                  {registerLoading ? "Creating..." : "Create member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}