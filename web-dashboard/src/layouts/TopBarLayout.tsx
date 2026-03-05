import { Outlet } from "react-router-dom";
import TopBar from "../components/domain/TopBar";
import "./TopBarLayout.css";

export default function TopBarLayout() {
  return (
    <div className="topbar-layout">
      <TopBar />
      <main><Outlet /></main>
    </div>
  );
}