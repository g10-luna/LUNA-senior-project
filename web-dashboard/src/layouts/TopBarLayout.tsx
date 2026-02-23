import { Outlet, useLocation } from "react-router-dom";
import TopBar from "../components/domain/TopBar";
import { ROUTE_TITLES } from "../lib/routes";

export default function TopBarLayout() {
  const { pathname } = useLocation();
  const title = ROUTE_TITLES[pathname] ?? "";

return (
  <div style={{
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--navy)"
  }}>
    <TopBar title={title} />
    <main style={{
      flex: 1,
      padding: "24px"
    }}>
      <Outlet />
    </main>
  </div>
);
}