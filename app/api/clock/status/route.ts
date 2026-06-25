import { NextResponse } from "next/server";
import { getClockIpDebug } from "@/lib/clock";

export async function GET(request: Request) {
  const debug = getClockIpDebug(request);
  const canClock = debug.clockAccess === "allowed";

  return NextResponse.json({
    canClock,
    detectedIp: debug.detectedIp,
    allowedIps: debug.allowedIps,
    clockAccess: debug.clockAccess,
    headers: debug.headers,
  });
}
