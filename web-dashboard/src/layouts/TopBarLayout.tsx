import { Outlet, useLocation } from "react-router-dom";
import TopBar from "../components/domain/TopBar";
import { ROUTE_TITLES } from "../lib/routes";
import "./TopBarLayout.css";

export default function TopBarLayout() {
  const title = ROUTE_TITLES[useLocation().pathname] ?? "";
  return (
    <div className="topbar-layout">
      <TopBar title={title} />
      <main><Outlet /></main>
    </div>
  );
}