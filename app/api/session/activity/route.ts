import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  createSignedSessionActivity,
  getActivityCookieOptions,
  getExpiredActivityCookieOptions,
  noStoreHeaders,
  validateSignedSessionActivity,
} from "@/lib/session/activity";
import { getTrustedSessionUserId, signOutLocalSupabaseSession } from "@/lib/session/server-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const userId = await getTrustedSessionUserId(body);
  const cookieValue = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  const validation = await validateSignedSessionActivity(cookieValue, userId ?? undefined);

  if (!userId || !validation.valid) {
    await signOutLocalSupabaseSession();
    const response = NextResponse.json({ error: "Session expired." }, { status: 401, headers: noStoreHeaders() });
    response.cookies.set(SESSION_COOKIE_NAME, "", getExpiredActivityCookieOptions());
    return response;
  }

  const response = new NextResponse(null, { status: 204, headers: noStoreHeaders() });
  const nextCookieValue = await createSignedSessionActivity({
    issuedAt: validation.payload.issuedAt,
    lastActivity: Date.now(),
    userId,
  });

  response.cookies.set(SESSION_COOKIE_NAME, nextCookieValue, getActivityCookieOptions());
  return response;
}
