export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  CATALOG: "/catalog",
  MAINTENANCE: "/maintenance",
  MAP: "/map",
  OPTIONS: "/options",
  ACCOUNT: "/account",
} as const;

export type AppRoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export const ROUTE_TITLES: Record<string, string> = {
  [ROUTES.DASHBOARD]: "Dashboard",
  [ROUTES.CATALOG]: "Library Catalog",
  [ROUTES.MAINTENANCE]: "Robot Maintenance",
  [ROUTES.MAP]: "Library Map",
  [ROUTES.OPTIONS]: "Options",
  [ROUTES.ACCOUNT]: "Account Settings",
};
