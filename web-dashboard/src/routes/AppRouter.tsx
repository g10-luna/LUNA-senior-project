// src/routes/AppRouter.tsx

import { Routes, Route, Navigate } from "react-router-dom";

import TopBarLayout from "../layouts/TopBarLayout";
import { ROUTES } from "../lib/routes";

import LoginScreen from "../screens/LoginScreen";
import Dashboard from "../screens/Dashboard";
import CatalogScreen from "../screens/CatalogScreen";
import MaintenanceScreen from "../screens/MaintenanceScreen";
import MapScreen from "../screens/MapScreen";
import OptionsScreen from "../screens/OptionsScreen";
import AccountSettingsScreen from "../screens/AccountSettingsScreen";

export default function AppRouter() {
  return (
    <Routes>
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

      {/* Auth routes (no TopBarLayout) */}
      <Route path={ROUTES.LOGIN} element={<LoginScreen />} />

      {/* Main app routes (wrapped with TopBarLayout shell) */}
      <Route element={<TopBarLayout />}>
        <Route path={ROUTES.DASHBOARD} element={<Dashboard/>} />
        <Route path={ROUTES.CATALOG} element={<CatalogScreen />} />
        <Route path={ROUTES.MAINTENANCE} element={<MaintenanceScreen />} />
        <Route path={ROUTES.MAP} element={<MapScreen />} />
        <Route path={ROUTES.OPTIONS} element={<OptionsScreen />} />
        <Route path={ROUTES.ACCOUNT} element={<AccountSettingsScreen />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}