import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "../layouts/ProtectedRoute";
import TopBarLayout from "../layouts/TopBarLayout";
import { ROUTES } from "../lib/routes";
import { tokenStorage } from "../lib/tokenStorage";
import AccountSettingsScreen from "../screens/AccountSettingsScreen";
import CatalogScreen from "../screens/CatalogScreen";
import Dashboard from "../screens/Dashboard";
import LoginScreen from "../screens/LoginScreen";
import MaintenanceScreen from "../screens/MaintenanceScreen";
import MapScreen from "../screens/MapScreen";
import OptionsScreen from "../screens/OptionsScreen";

const RootRedirect = () => <Navigate to={tokenStorage.isAuthenticated() ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />;

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path={ROUTES.LOGIN} element={<LoginScreen />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<TopBarLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.CATALOG} element={<CatalogScreen />} />
          <Route path={ROUTES.MAINTENANCE} element={<MaintenanceScreen />} />
          <Route path={ROUTES.MAP} element={<MapScreen />} />
          <Route path={ROUTES.OPTIONS} element={<OptionsScreen />} />
          <Route path={ROUTES.ACCOUNT} element={<AccountSettingsScreen />} />
        </Route>
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}