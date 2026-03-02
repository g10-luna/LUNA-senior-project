/* placeholder. View by adding /dashboard to the URL*/

export default function DashboardScreen() {
  return (
    <div style={{ display: "grid", gap: "20px" }}>
      
      <div className="card">
        <div className="section-title">System Status</div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "20px"
      }}>
        <div className="card">Current Task</div>
        <div className="card">Task Queue</div>
        <div className="card">Alerts / Warnings</div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "20px"
      }}>
        <div className="card">Today's Summary</div>
        <div className="card">Recent Activity</div>
        <div className="card">Quick Links</div>
      </div>

    </div>
  );
}