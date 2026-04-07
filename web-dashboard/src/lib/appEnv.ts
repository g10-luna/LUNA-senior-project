/**
 * Mock auth only runs in Vite dev (`npm run dev`). Production builds never use it.
 *
 * Only the string "true" (after trim) enables mock — not booleans, so a stray injected
 * `true` cannot turn it on. Set `VITE_USE_MOCK_AUTH=true` in web-dashboard/.env when needed.
 */
function envStringIsExplicitTrue(v: unknown): boolean {
  return typeof v === "string" && v.trim().toLowerCase() === "true";
}

export const USE_MOCK_AUTH =
  Boolean(import.meta.env.DEV) && envStringIsExplicitTrue(import.meta.env.VITE_USE_MOCK_AUTH);

if (USE_MOCK_AUTH) {
  console.warn(
    "[LUNA] Mock authentication is ON: any email + password (8+ chars) will sign you in. " +
      "For real Supabase login, set VITE_USE_MOCK_AUTH=false in web-dashboard/.env, " +
      "check `printenv VITE_USE_MOCK_AUTH` (shell env overrides .env), then restart `npm run dev`."
  );
}
