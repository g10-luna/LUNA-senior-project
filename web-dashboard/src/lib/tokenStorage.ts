const ACCESS = "access_token";
const REFRESH = "refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS),
  setAccess: (t: string) => localStorage.setItem(ACCESS, t),
  getRefresh: () => localStorage.getItem(REFRESH),
  setRefresh: (t: string) => localStorage.setItem(REFRESH, t),
  clear: () => { localStorage.removeItem(ACCESS); localStorage.removeItem(REFRESH); },
  isAuthenticated: () => !!localStorage.getItem(ACCESS),
};