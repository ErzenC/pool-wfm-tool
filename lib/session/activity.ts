import { SESSION_COOKIE_NAME, getSessionActivitySecret, getSessionConfig } from "./config";

export type SessionActivityPayload = {
  issuedAt: number;
  lastActivity: number;
  userId: string;
};

type ValidationResult =
  | { valid: true; payload: SessionActivityPayload }
  | { valid: false; reason: "missing" | "malformed" | "signature" | "idle-expired" | "absolute-expired" | "user-mismatch" };

const encoder = new TextEncoder();

function base64UrlEncode(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? encoder.encode(value) : new Uint8Array(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

async function signPayload(encodedPayload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionActivitySecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));
  return base64UrlEncode(signature);
}

export async function createSignedSessionActivity(payload: SessionActivityPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function validateSignedSessionActivity(
  cookieValue: string | undefined,
  expectedUserId?: string,
): Promise<ValidationResult> {
  if (!cookieValue) {
    return { valid: false, reason: "missing" };
  }

  const [encodedPayload, signature] = cookieValue.split(".");

  if (!encodedPayload || !signature) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSignature = await signPayload(encodedPayload);

  if (!safeEqual(signature, expectedSignature)) {
    return { valid: false, reason: "signature" };
  }

  let payload: SessionActivityPayload;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionActivityPayload;
  } catch {
    return { valid: false, reason: "malformed" };
  }

  if (
    !payload.userId ||
    !Number.isFinite(payload.issuedAt) ||
    !Number.isFinite(payload.lastActivity) ||
    payload.lastActivity < payload.issuedAt
  ) {
    return { valid: false, reason: "malformed" };
  }

  if (expectedUserId && expectedUserId !== payload.userId) {
    return { valid: false, reason: "user-mismatch" };
  }

  const now = Date.now();
  const config = getSessionConfig();

  if (now - payload.lastActivity > config.idleTimeoutMs) {
    return { valid: false, reason: "idle-expired" };
  }

  if (now - payload.issuedAt > config.absoluteTimeoutMs) {
    return { valid: false, reason: "absolute-expired" };
  }

  return { valid: true, payload };
}

export function getActivityCookieOptions() {
  const config = getSessionConfig();

  return {
    httpOnly: true,
    secure: config.secureCookie,
    sameSite: "lax" as const,
    path: "/",
    maxAge: config.cookieMaxAgeSeconds,
  };
}

export function getExpiredActivityCookieOptions() {
  return {
    httpOnly: true,
    secure: getSessionConfig().secureCookie,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export { SESSION_COOKIE_NAME };
