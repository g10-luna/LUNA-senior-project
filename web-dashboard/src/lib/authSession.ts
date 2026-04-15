import { ROUTES } from "./routes";
import { tokenStorage } from "./tokenStorage";

export function isAuthenticated(): boolean {
  return tokenStorage.isAuthenticated();
}

export function getRootRedirectPath(): (typeof ROUTES)[keyof typeof ROUTES] {
  return isAuthenticated() ? ROUTES.DASHBOARD : ROUTES.LOGIN;
}

