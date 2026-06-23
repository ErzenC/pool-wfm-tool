export const SESSION_COOKIE_NAME = "wfm_session_activity";

export function getSessionConfig() {
  const idleMinutes = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES ?? 30);
  const absoluteHours = Number(process.env.SESSION_ABSOLUTE_TIMEOUT_HOURS ?? 12);

  return {
    idleTimeoutMs: Number.isFinite(idleMinutes) && idleMinutes > 0 ? idleMinutes * 60 * 1000 : 30 * 60 * 1000,
    absoluteTimeoutMs: Number.isFinite(absoluteHours) && absoluteHours > 0 ? absoluteHours * 60 * 60 * 1000 : 12 * 60 * 60 * 1000,
    cookieMaxAgeSeconds: Number.isFinite(absoluteHours) && absoluteHours > 0 ? absoluteHours * 60 * 60 : 12 * 60 * 60,
    secureCookie: process.env.NODE_ENV === "production",
  };
}

export function getSessionActivitySecret() {
  const secret = process.env.SESSION_ACTIVITY_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing SESSION_ACTIVITY_SECRET.");
  }

  return "pool-wfm-development-session-secret";
}
