export const DEV_ALLOWED_IPS = ["127.0.0.1", "::1"];

export function normalizeIp(ip: string): string {
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    return "127.0.0.1";
  }

  return ip;
}

export function getAllowedClockIps(extraIps: string[] = []) {
  const normalizedExtraIps = extraIps.map((ip) => normalizeIp(ip.trim())).filter(Boolean);

  if (normalizedExtraIps.length > 0) {
    return normalizedExtraIps;
  }

  return (process.env.CLOCK_ALLOWED_IPS ?? "")
    .split(",")
    .map((ip) => normalizeIp(ip.trim()))
    .filter(Boolean);
}

export function isClockIpAllowed(ip: string, extraIps: string[] = []): boolean {
  const normalizedIp = normalizeIp(ip);
  const allowedIps = getAllowedClockIps(extraIps);

  if (process.env.NODE_ENV === "development") {
    return [...allowedIps, ...DEV_ALLOWED_IPS.map(normalizeIp)].includes(normalizedIp);
  }

  return allowedIps.includes(normalizedIp);
}

export function canWorkerClockFromIp(ip: string, extraIps: string[] = []): boolean {
  return isClockIpAllowed(ip, extraIps);
}

export function getClockIpDebug(request: Request, extraIps: string[] = []) {
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim() ?? null;
  const realIp = request.headers.get("x-real-ip")?.trim() ?? null;
  const forwardedFor = request.headers.get("x-forwarded-for")?.trim() ?? null;
  const forwardedFirstIp = forwardedFor?.split(",")[0]?.trim() ?? null;
  const fallbackIp =
    ((request as Request & { ip?: string }).ip ??
      (request as Request & { socket?: { remoteAddress?: string } }).socket?.remoteAddress ??
      null);
  const detectedIp = cfConnectingIp || realIp || forwardedFirstIp || fallbackIp;
  const normalizedDetectedIp = detectedIp ? normalizeIp(detectedIp) : null;

  return {
    detectedIp: normalizedDetectedIp,
    allowedIps: getAllowedClockIps(extraIps),
    clockAccess: normalizedDetectedIp && isClockIpAllowed(normalizedDetectedIp, extraIps) ? "allowed" : "blocked",
    headers: {
      "cf-connecting-ip": cfConnectingIp,
      "x-real-ip": realIp,
      "x-forwarded-for": forwardedFor,
    },
  };
}

export function getRequestIp(request: Request): string | null {
  return getClockIpDebug(request).detectedIp;
}
