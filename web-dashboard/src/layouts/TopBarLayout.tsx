import { NavLink, Outlet, useLocation } from "react-router-dom";
import AutoRobotTaskIngest from "../components/domain/AutoRobotTaskIngest";
import TopBar from "../components/domain/TopBar";
import { ROUTES, ROUTE_TITLES } from "../lib/routes";
import "./TopBarLayout.css";

export default function TopBarLayout() {
  const title = ROUTE_TITLES[useLocation().pathname] ?? "";

  return (
    <div className="topbar-layout">
      <TopBar title={title} />
      <AutoRobotTaskIngest />
      <div className="topbar-layout-content">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <NavLink
              to={ROUTES.DASHBOARD}
              className={({ isActive }) => `sidebar-link${isActive ? " sidebar-link-active" : ""}`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to={ROUTES.CATALOG}
              className={({ isActive }) => `sidebar-link${isActive ? " sidebar-link-active" : ""}`}
            >
              Catalog
            </NavLink>
            <NavLink
              to={ROUTES.REQUESTS}
              className={({ isActive }) => `sidebar-link${isActive ? " sidebar-link-active" : ""}`}
            >
              Requests
            </NavLink>
            <NavLink
              to={ROUTES.MAINTENANCE}
              className={({ isActive }) => `sidebar-link${isActive ? " sidebar-link-active" : ""}`}
            >
              Maintenance
            </NavLink>
            <NavLink
              to={ROUTES.MAP}
              className={({ isActive }) => `sidebar-link${isActive ? " sidebar-link-active" : ""}`}
            >
              Map
            </NavLink>
            <NavLink
              to={ROUTES.ACCOUNT}
              className={({ isActive }) => `sidebar-link${isActive ? " sidebar-link-active" : ""}`}
            >
              Account
            </NavLink>
          </nav>
        </aside>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}