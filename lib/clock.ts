export const ALLOWED_CLOCK_IPS = ["172.16.5.31", "172.16.5.21"];
export const DEV_ALLOWED_IPS = ["::1", "127.0.0.1"];

export function normalizeIp(ip: string): string {
  if (ip === "::ffff:127.0.0.1") {
    return "127.0.0.1";
  }

  return ip;
}

export function canWorkerClockFromIp(ip: string): boolean {
  const normalizedIp = normalizeIp(ip);

  if (process.env.NODE_ENV === "development") {
    return [...ALLOWED_CLOCK_IPS, ...DEV_ALLOWED_IPS].includes(normalizedIp);
  }

  return ALLOWED_CLOCK_IPS.includes(normalizedIp);
}

export function getRequestIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();

  const detectedIp = forwardedFor || realIp || vercelIp || null;

  return detectedIp ? normalizeIp(detectedIp) : null;
}
