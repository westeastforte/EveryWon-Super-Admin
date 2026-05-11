// Hardcoded admin identity — Firebase Auth replaced with cookie-based session.
// TODO: move to env vars / proper auth before production.

export const currentUser = { username: "admin", role: "admin" } as const;

export function isAdmin(): boolean {
  return true;
}
