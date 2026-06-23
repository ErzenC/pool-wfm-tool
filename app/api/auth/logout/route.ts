import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getExpiredActivityCookieOptions, noStoreHeaders } from "@/lib/session/activity";
import { signOutLocalSupabaseSession } from "@/lib/session/server-user";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  await signOutLocalSupabaseSession();
  const response = new NextResponse(null, { status: 204, headers: noStoreHeaders() });
  response.cookies.set(SESSION_COOKIE_NAME, "", getExpiredActivityCookieOptions());
  return response;
}
