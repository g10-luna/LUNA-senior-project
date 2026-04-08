import { Link } from "react-router-dom";
import { ROUTES } from "../lib/routes";
import "./OptionsScreen.css";

type OptionItem = {
  title: string;
  description: string;
  to: string;
  subtasks?: Array<{ label: string; to: string }>;
};

type OptionSection = {
  title: string;
  items: OptionItem[];
};

const SECTIONS: OptionSection[] = [
  {
    title: "Navigation",
    items: [
      { title: "Dashboard", description: "Monitor robot tasks and system activity", to: ROUTES.DASHBOARD },
      {
        title: "Library Catalog",
        description: "View, search, and manage book inventory, availability, and shelf locations",
        to: ROUTES.CATALOG,
        subtasks: [
          { label: "Add book", to: `${ROUTES.CATALOG}?add=1` },
          { label: "Search catalog", to: ROUTES.CATALOG },
        ],
      },
      {
        title: "Library Map",
        description: "View the robot's current position and navigate library layout and shelf locations",
        to: ROUTES.MAP,
      },
    ],
  },
  {
    title: "Robot & System",
    items: [
      {
        title: "Robot Maintenance",
        description: "Monitor system diagnostics, sensors, and maintenance history",
        to: ROUTES.MAINTENANCE,
        subtasks: [
          { label: "Task view", to: `${ROUTES.DASHBOARD}#task-queue` },
          { label: "Generate report", to: `${ROUTES.MAINTENANCE}#maintenance-report` },
        ],
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        title: "Account Settings",
        description: "Manage user profile, permissions, and notification preferences",
        to: ROUTES.ACCOUNT,
        subtasks: [
          { label: "Edit profile", to: `${ROUTES.ACCOUNT}#profile-edit` },
          { label: "Add user", to: `${ROUTES.DASHBOARD}#register-member` },
          { label: "Security", to: `${ROUTES.ACCOUNT}#security` },
        ],
      },
    ],
  },
];

export default function OptionsScreen() {
  return (
    <div className="options-page">
      {SECTIONS.map((section) => (
        <section key={section.title} className="options-section-card">
          <h2 className="options-section-title">{section.title}</h2>
          <div className="options-items">
            {section.items.map((item) => (
              <div key={item.title} className="options-item-wrap">
                <Link to={item.to} className="options-item-pill">
                  <span className="options-item-title">{item.title}</span>
                  <span className="options-item-desc"> - {item.description}</span>
                </Link>
                {item.subtasks?.length ? (
                  <div className="options-subtasks">
                    {item.subtasks.map((sub) => (
                      <Link key={sub.label} to={sub.to} className="options-subtask-btn">
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}