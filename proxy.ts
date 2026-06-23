import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  getExpiredActivityCookieOptions,
  noStoreHeaders,
  validateSignedSessionActivity,
} from "@/lib/session/activity";

const protectedPrefixes = [
  "/admin",
  "/manager",
  "/worker",
  "/dashboard",
  "/schedule",
  "/staffing",
  "/attendance",
  "/api/clock",
  "/api/weather",
];

const publicPrefixes = [
  "/login",
  "/forgot-password",
  "/auth/callback",
  "/api/session",
  "/api/auth/logout",
  "/_next",
];

const publicFiles = ["/favicon.ico", "/file.svg", "/globe.svg", "/next.svg", "/vercel.svg", "/window.svg"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    publicFiles.includes(pathname) ||
    publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

function clearActivityCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", getExpiredActivityCookieOptions());
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) && !isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const validation = await validateSignedSessionActivity(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  if (validation.valid) {
    const response = NextResponse.next();
    Object.entries(noStoreHeaders()).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }

  if (pathname.startsWith("/api/")) {
    return clearActivityCookie(
      NextResponse.json({ error: "Session expired." }, { status: 401, headers: noStoreHeaders() }),
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "?reason=session-expired";
  return clearActivityCookie(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/manager/:path*",
    "/worker/:path*",
    "/dashboard/:path*",
    "/schedule/:path*",
    "/staffing/:path*",
    "/attendance/:path*",
    "/api/clock/:path*",
    "/api/weather/:path*",
  ],
};
