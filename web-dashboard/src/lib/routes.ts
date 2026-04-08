export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  SETUP_ACCOUNT: "/set-up-account",
  DASHBOARD: "/dashboard",
  CATALOG: "/catalog",
  REQUESTS: "/requests",
  MAINTENANCE: "/maintenance",
  MAP: "/map",
  OPTIONS: "/options",
  ACCOUNT: "/account",
} as const;

export type AppRoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export const ROUTE_TITLES: Record<string, string> = {
  [ROUTES.FORGOT_PASSWORD]: "Forgot password",
  [ROUTES.RESET_PASSWORD]: "Set new password",
  [ROUTES.DASHBOARD]: "Dashboard",
  [ROUTES.CATALOG]: "Library Catalog",
  [ROUTES.REQUESTS]: "Requests",
  [ROUTES.MAINTENANCE]: "Robot Maintenance",
  [ROUTES.MAP]: "Library Map",
  [ROUTES.OPTIONS]: "Options",
  [ROUTES.ACCOUNT]: "Account Settings",
  [ROUTES.SETUP_ACCOUNT]: "Set up account",
};
