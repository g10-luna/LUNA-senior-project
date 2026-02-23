/* placeholder. View by adding /options to the URL*/
import { Link } from "react-router-dom";
import { ROUTES } from "../lib/routes";

export default function OptionsScreen() {
  const items = [
    { label: "Dashboard", to: ROUTES.DASHBOARD },
    { label: "Library Catalog", to: ROUTES.CATALOG },
    { label: "Robot Maintenance", to: ROUTES.MAINTENANCE },
    { label: "Library Map", to: ROUTES.MAP },
    { label: "Account Settings", to: ROUTES.ACCOUNT },
  ];

  return (
    <div>
      <h1 className="placeholder-text">Options</h1>
      <p className="placeholder-text">Select a destination:</p>

      <ul style={{ paddingLeft: "18px", lineHeight: 2 }}>
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to}>{item.label}</Link>
          </li>
        ))}
      </ul>

      <hr style={{ margin: "24px 0" }} />

      {/* Optional: a quick link back home */}
      <Link to={ROUTES.DASHBOARD}>← Back to Dashboard</Link>
    </div>
  );
}