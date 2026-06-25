import { NextResponse } from "next/server";
import { canWorkerClockFromIp, getRequestIp } from "@/lib/clock";

type ClockActionRequest = {
  workerId?: string;
  type?: "CLOCK_IN" | "CLOCK_OUT";
  actionDate?: string;
  role?: "worker" | "admin";
  workerExists?: boolean;
  workerActive?: boolean;
  isScheduledToday?: boolean;
  allowedClockIps?: string[];
};

function getBusinessTodayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(request: Request) {
  const body = (await request.json()) as ClockActionRequest;

  if (!body.workerId || (body.type !== "CLOCK_IN" && body.type !== "CLOCK_OUT")) {
    return NextResponse.json({ error: "Invalid clock action." }, { status: 400 });
  }

  if (body.workerExists === false) {
    return NextResponse.json({ error: "Worker not found." }, { status: 404 });
  }

  if (body.workerActive === false) {
    return NextResponse.json({ error: "Inactive workers cannot clock in or out." }, { status: 403 });
  }

  if (body.role !== "worker") {
    return NextResponse.json({ error: "Unauthorized clock action." }, { status: 403 });
  }

  const today = getBusinessTodayIso();
  const actionDate = body.actionDate ?? today;

  if (actionDate !== today) {
    return NextResponse.json(
      { error: "Clock In/Out is only available for today." },
      { status: 400 },
    );
  }

  if (!body.isScheduledToday) {
    return NextResponse.json(
      { error: "Clock In/Out is available only when you are scheduled for today." },
      { status: 400 },
    );
  }

  const detectedIp = getRequestIp(request);

  if (!detectedIp || !canWorkerClockFromIp(detectedIp, body.allowedClockIps ?? [])) {
    return NextResponse.json(
      {
        error: "Clock In/Out is available only from authorized Aqua Park networks.",
        canClock: false,
        detectedIp,
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    id: `clock-${Date.now()}-${body.workerId}`,
    workerId: body.workerId,
    type: body.type,
    timestamp: new Date().toISOString(),
    date: today,
    createdBy: body.workerId,
    source: "WORKER",
    note: body.type === "CLOCK_IN" ? "Clock In created by worker" : "Clock Out created by worker",
    ipAddress: detectedIp,
  });
}
