import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./MaintenanceScreen.css";
import RobotTaskBoard from "../components/domain/RobotTaskBoard";
import { useRobotStatus } from "../lib/useRobotStatus";
import { getRobotStateLabel } from "../lib/robotStateUi";

function StatusBar({ label, value, unit = "%", color = "#184468" }: { label: string; value: number; unit?: string; color?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="maint-metric">
      <div className="maint-metric-header">
        <span className="maint-metric-label">{label}</span>
        <span className="maint-metric-value">
          {clamped}
          {unit}
        </span>
      </div>
      <div className="maint-metric-bar">
        <div className="maint-metric-bar-fill" style={{ width: `${clamped}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function downloadMaintenanceReport(options: {
  stateLabel: string;
  battery: number;
  location: string;
  cpuUsage: number;
  memoryUsage: number;
  temperature: number;
  navAccuracy: number;
}) {
  const generated = new Date().toISOString();
  const lines = [
    "LUNA — Robot maintenance report",
    `Generated (UTC): ${generated}`,
    "",
    "Operational",
    `  Status: ${options.stateLabel}`,
    `  Battery: ${options.battery}%`,
    `  Location: ${options.location}`,
    "",
    "System health (UI snapshot)",
    `  CPU usage: ${Math.round(options.cpuUsage)}%`,
    `  Memory usage: ${Math.round(options.memoryUsage)}%`,
    `  Temperature: ${Math.round(options.temperature)}°C`,
    `  Navigation accuracy: ${Math.round(options.navAccuracy)}%`,
    "",
    "Schedule",
    "  System uptime: 342h",
    "  Last maintenance: 1/28/2026",
    "  Next scheduled: 2/27/2026",
    "",
    "--- End of report ---",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `luna-maintenance-report-${generated.slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function MaintenanceScreen() {
  const location = useLocation();
  const { statuses, loading, error } = useRobotStatus();
  const robot = statuses?.[0] ?? null;
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (id !== "maintenance-report" && id !== "tasks-completed") return;
    const el = document.getElementById(id);
    if (!el) return;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.hash]);

  const battery = robot?.batteryPercent ?? 0;
  const isActive = robot && (robot.state === "NAVIGATING" || robot.state === "BUSY");

  // Simple mock “health” metrics derived from battery + state so the UI has values.
  const cpuUsage = 35 + (isActive ? 20 : 0);
  const memoryUsage = 55 + (isActive ? 10 : 0);
  const temperature = 40 + (isActive ? 5 : 0);
  const navAccuracy = 90 - (battery < 30 ? 10 : 0);
  const stateLabel = getRobotStateLabel(robot?.state ?? "IDLE");

  const handleGenerateReport = () => {
    setReportMessage(null);
    setReportBusy(true);
    window.setTimeout(() => {
      try {
        downloadMaintenanceReport({
          stateLabel,
          battery,
          location: robot?.locationLabel ?? "Unknown",
          cpuUsage,
          memoryUsage,
          temperature,
          navAccuracy,
        });
        setReportMessage("Report downloaded.");
        window.setTimeout(() => setReportMessage(null), 4000);
      } finally {
        setReportBusy(false);
      }
    }, 200);
  };

  return (
    <div className="maint-page">
      <header className="maint-page-top" id="maintenance-report">
        <h1 className="section-title maint-page-title">Robot Maintenance</h1>
        <div className="maint-page-top-actions">
          <button
            type="button"
            className="maint-report-btn"
            disabled={reportBusy || !!error}
            onClick={() => handleGenerateReport()}
          >
            {reportBusy ? "Generating…" : "Generate report"}
          </button>
          {reportMessage && (
            <span className="maint-report-toast" role="status">
              {reportMessage}
            </span>
          )}
        </div>
      </header>
      {error && <p className="maint-text-error">{error.message}</p>}
      {loading && !error && <p className="maint-text-muted">Loading robot status…</p>}

      <div className="maint-grid">
        <section className="card maint-card">
          <header className="maint-card-header maint-card-header--primary">
            <div>
              <div className="maint-card-title">Operational Status</div>
              <div className="maint-card-subtitle">Battery &amp; current location</div>
            </div>
            <span className={`maint-pill ${isActive ? "maint-pill--active" : "maint-pill--idle"}`}>
              {stateLabel}
            </span>
          </header>

          <div className="maint-card-body">
            <div className="maint-row">
              <span className="maint-row-label">Battery Level</span>
              <span className="maint-row-value">{battery}%</span>
            </div>
            <div className="maint-battery-bar">
              <div className="maint-battery-bar-fill" style={{ width: `${battery}%` }} />
            </div>
            <div className="maint-row">
              <span className="maint-row-label">Current Location</span>
              <span className="maint-row-value">{robot?.locationLabel ?? "Unknown"}</span>
            </div>
          </div>
        </section>

        <section className="card maint-card">
          <header className="maint-card-header">
            <div>
              <div className="maint-card-title">System Health</div>
              <div className="maint-card-subtitle">Live robot telemetry (mocked)</div>
            </div>
            <span className="maint-pill maint-pill--good">Good</span>
          </header>
          <div className="maint-card-body">
            <StatusBar label="CPU Usage" value={cpuUsage} />
            <StatusBar label="Memory Usage" value={memoryUsage} />
            <StatusBar label="Temperature" value={temperature} unit="℃" color="#E29532" />
            <StatusBar label="Navigation Accuracy" value={navAccuracy} />
          </div>
        </section>

        <section className="card maint-card">
          <header className="maint-card-header">
            <div>
              <div className="maint-card-title">Sensor Status</div>
              <div className="maint-card-subtitle">Key robot subsystems</div>
            </div>
            <span className="maint-pill maint-pill--active">Active</span>
          </header>
          <div className="maint-card-body maint-sensor-list">
            <div className="maint-row">
              <span className="maint-row-label">Camera Sensor</span>
              <span className="maint-sensor-chip maint-sensor-chip--ok">OK</span>
            </div>
            <div className="maint-row">
              <span className="maint-row-label">Proximity / LIDAR</span>
              <span className="maint-sensor-chip maint-sensor-chip--ok">OK</span>
            </div>
            <div className="maint-row">
              <span className="maint-row-label">Drive Motors</span>
              <span className="maint-sensor-chip maint-sensor-chip--warn">Warm</span>
            </div>
          </div>
        </section>

        <section className="card maint-card maint-card--wide maint-card--task-board" id="tasks-completed">
          <div className="maint-card-body maint-task-board-wrap">
            <RobotTaskBoard />
          </div>
        </section>

        <section className="card maint-card maint-card--wide">
          <header className="maint-card-header">
            <div>
              <div className="maint-card-title">Maintenance Schedule</div>
              <div className="maint-card-subtitle">Recent and upcoming service</div>
            </div>
          </header>
          <div className="maint-card-body maint-schedule">
            <div>
              <div className="maint-label">System Uptime</div>
              <div className="maint-value">342h</div>
            </div>
            <div>
              <div className="maint-label">Last Maintenance</div>
              <div className="maint-value maint-value--muted">1/28/2026</div>
            </div>
            <div>
              <div className="maint-label">Next Scheduled</div>
              <div className="maint-value maint-value--primary">2/27/2026</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}