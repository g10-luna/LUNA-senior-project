import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "../lib/routes";
import { tokenStorage } from "../lib/tokenStorage";

export function ProtectedRoute() {
  return tokenStorage.isAuthenticated() ? <Outlet /> : <Navigate to={ROUTES.LOGIN} replace />;
}

export function PublicOnlyRoute() {
  return tokenStorage.isAuthenticated() ? <Navigate to={ROUTES.DASHBOARD} replace /> : <Outlet />;
}