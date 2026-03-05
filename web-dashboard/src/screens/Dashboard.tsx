import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import { ROUTES } from "../lib/routes";

const mockDashboard = {
  greetingName: "Shirley",
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
  const reservedPct = 100 - availablePct - checkedOutPct;

  const inventoryChartBackground = `conic-gradient(
    #181e2437 0 ${availablePct}%,
    #e53e3e ${availablePct}% ${availablePct + checkedOutPct}%,
    #092fad ${availablePct + checkedOutPct}% 100%
  )`;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-heading">
          <div className="dashboard-greeting">
            Good morning, <span className="dashboard-greeting-strong">{mockDashboard.greetingName}</span>
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
            <button type="button" className="dashboard-card-link" onClick={() => navigate(ROUTES.OPTIONS)} >
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
            <div className="dashboard-pill">
              <span className="dashboard-pill-dot blue" />
              <div>
                <div className="dashboard-pill-label-strong">Robot</div>
                <div className="dashboard-pill-label-sub">Running mock tasks</div>
              </div>
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
        </div>

        <div className="card">
          <div className="dashboard-card-header">
            <h2 className="dashboard-card-title">Quick Actions</h2>
          </div>
          <div className="dashboard-quick-actions">
            <button type="button" className="dashboard-quick-button" onClick={() => navigate(ROUTES.CATALOG)}>
              <span className="dashboard-quick-button-label">
                <span className="dashboard-quick-button-icon" aria-hidden>📚</span>
                <span>Add Book</span>
              </span>
              <span className="dashboard-quick-button-plus">＋</span>
            </button>
            <button type="button" className="dashboard-quick-button">
              <span className="dashboard-quick-button-label">
                <span className="dashboard-quick-button-icon" aria-hidden>👤</span>
                <span>Register Member</span>
              </span>
              <span className="dashboard-quick-button-plus">＋</span>
            </button>
            <button type="button" className="dashboard-quick-button">
              <span className="dashboard-quick-button-label">
                <span className="dashboard-quick-button-icon" aria-hidden>🧾</span>
                <span>Checkout</span>
              </span>
              <span className="dashboard-quick-button-plus">＋</span>
            </button>
            <button type="button" className="dashboard-quick-button">
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
            <button type="button" className="dashboard-card-link">View all →</button>
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
              className="dashboard-inventory-chart"
              style={{ backgroundImage: inventoryChartBackground }}
              aria-hidden
            >
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
                  <span className="dashboard-inventory-dot available" /> Available
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
    </div>
  );
}