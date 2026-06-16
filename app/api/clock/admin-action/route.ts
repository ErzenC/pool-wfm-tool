import { NextResponse } from "next/server";

type AdminClockActionRequest = {
  workerId?: string;
  type?: "CLOCK_IN" | "CLOCK_OUT";
  actionDate?: string;
  role?: "admin" | "worker";
  workerExists?: boolean;
  workerActive?: boolean;
  createdBy?: string;
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
  const body = (await request.json()) as AdminClockActionRequest;

  if (body.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized clock action." }, { status: 403 });
  }

  if (!body.workerId || (body.type !== "CLOCK_IN" && body.type !== "CLOCK_OUT")) {
    return NextResponse.json({ error: "Invalid clock action." }, { status: 400 });
  }

  if (body.workerExists === false) {
    return NextResponse.json({ error: "Worker not found." }, { status: 404 });
  }

  const today = getBusinessTodayIso();

  if (body.actionDate !== today) {
    return NextResponse.json(
      { error: "Clock records can only be edited on the current day." },
      { status: 400 },
    );
  }

  if (body.workerActive === false) {
    return NextResponse.json(
      { error: "Inactive workers cannot be clocked in or out." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    id: `admin-clock-${Date.now()}-${body.workerId}`,
    workerId: body.workerId,
    type: body.type,
    timestamp: new Date().toISOString(),
    date: today,
    createdBy: body.createdBy ?? "admin",
    source: "ADMIN_OVERRIDE",
    note:
      body.type === "CLOCK_IN"
        ? "Clock In created manually by admin"
        : "Clock Out created manually by admin",
    ipAddress: null,
  });
}
