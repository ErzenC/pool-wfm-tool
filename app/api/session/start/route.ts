import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  createSignedSessionActivity,
  getActivityCookieOptions,
  noStoreHeaders,
} from "@/lib/session/activity";
import { getTrustedSessionUserId } from "@/lib/session/server-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const userId = await getTrustedSessionUserId(body);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: noStoreHeaders() });
  }

  const now = Date.now();
  const response = new NextResponse(null, { status: 204, headers: noStoreHeaders() });
  const cookieValue = await createSignedSessionActivity({
    issuedAt: now,
    lastActivity: now,
    userId,
  });

  response.cookies.set(SESSION_COOKIE_NAME, cookieValue, getActivityCookieOptions());
  return response;
}
