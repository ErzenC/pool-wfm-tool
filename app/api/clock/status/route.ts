import { NextResponse } from "next/server";
import { canWorkerClockFromIp, getRequestIp } from "@/lib/clock";

export async function GET(request: Request) {
  const detectedIp = getRequestIp(request);
  const canClock = detectedIp ? canWorkerClockFromIp(detectedIp) : false;

  return NextResponse.json({
    canClock,
    detectedIp,
    clockAccess: canClock ? "allowed" : "blocked",
  });
}
