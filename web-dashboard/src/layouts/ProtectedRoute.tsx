import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "../lib/routes";
import { isAuthenticated } from "../lib/authSession";

export function ProtectedRoute() {
  return isAuthenticated() ? <Outlet /> : <Navigate to={ROUTES.LOGIN} replace />;
}

export function PublicOnlyRoute() {
  return isAuthenticated() ? <Navigate to={ROUTES.DASHBOARD} replace /> : <Outlet />;
}
