"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { kosovoCityCoordinates, type KosovoCity, type WeatherForecast } from "@/lib/weather";

type Role = "admin" | "worker";
type DemandLevel =
  | "Very Hot / Excellent pool weather"
  | "Hot"
  | "Warm"
  | "Normal"
  | "Weak weather"
  | "Rain / Cold";
type Rating = 1 | 2 | 3 | 4 | 5;
type Tab = "dashboard" | "sectors" | "workers" | "staffing" | "hours" | "settings" | "worker";
type ShiftNumber = 1 | 2;
type ClockLogType = "CLOCK_IN" | "CLOCK_OUT";
type ClockSource = "WORKER" | "ADMIN_OVERRIDE";

type Account = {
  email: string;
  username: string;
  password: string;
  role: Role;
  name: string;
  workerId?: string;
};

type Sector = {
  id: string;
  name: string;
};

type Worker = {
  id: string;
  employeeCode: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  sectorId: string;
  rating: Rating;
  active: boolean;
};

type ClockLog = {
  id: string;
  workerId: string;
  type: ClockLogType;
  timestamp: string;
  date: string;
  createdBy: string;
  source: ClockSource;
  note: string;
  ipAddress: string | null;
};

type ManualHourAdjustment = {
  id: string;
  workerId: string;
  dateFrom: string;
  dateTo: string;
  totalMinutes: number;
  updatedAt: string;
  updatedBy: string;
};

type WorkerForm = Omit<Worker, "id"> & {
  temporaryPassword: string;
};

type DemandSettings = Record<DemandLevel, number>;

type StaffingAssignment = {
  id: string;
  date: string;
  sectorId: string;
  workerId: string;
  shift: ShiftNumber;
};

type Assignments = StaffingAssignment[];
type LegacyAssignments = Record<string, string[]>;

type AppState = {
  sectors: Sector[];
  workers: Worker[];
  demandSettings: DemandSettings;
  leaveBufferOnFullDemand: boolean;
  selectedCity: string;
  assignments: Assignments;
  clockLogs: ClockLog[];
  manualHourAdjustments: ManualHourAdjustment[];
};

const STORAGE_KEY = "pool-wfm-state-v3";
const SESSION_KEY = "pool-wfm-session-v3";
const MAX_ACTIVE_WORKERS = 150;

const kosovoCities = Object.keys(kosovoCityCoordinates) as KosovoCity[];

const accounts: Account[] = [
  {
    email: "admin@poolwfm.local",
    username: "admin@poolwfm.local",
    password: "admin123",
    role: "admin",
    name: "Admin",
  },
  {
    email: "2026001@poolwfm.local",
    username: "2026001",
    password: "diar123",
    role: "worker",
    name: "Diar Haxhimehmeti",
    workerId: "w-01",
  },
];

const initialState: AppState = {
  sectors: [
    { id: "entrance", name: "Entrance" },
    { id: "restaurant", name: "Restaurant" },
    { id: "pool-area", name: "Pool Area" },
    { id: "slides", name: "Slides" },
    { id: "cleaning", name: "Cleaning" },
    { id: "security", name: "Security" },
  ],
  workers: [
    { id: "w-01", employeeCode: "2026001", username: "2026001", password: "diar123", firstName: "Diar", lastName: "Haxhimehmeti", jobTitle: "Restaurant Worker", sectorId: "restaurant", rating: 4, active: true },
    { id: "w-02", employeeCode: "2026102", username: "2026102", password: "worker123", firstName: "Daniel", lastName: "Horvath", jobTitle: "Pool attendant", sectorId: "pool-area", rating: 4, active: true },
    { id: "w-03", employeeCode: "2026004", username: "2026004", password: "worker123", firstName: "Eva", lastName: "Nagy", jobTitle: "Safety Monitor", sectorId: "pool-area", rating: 5, active: true },
    { id: "w-04", employeeCode: "2026104", username: "2026104", password: "worker123", firstName: "Adam", lastName: "Szabo", jobTitle: "Slide attendant", sectorId: "slides", rating: 3, active: true },
    { id: "w-05", employeeCode: "2026105", username: "2026105", password: "worker123", firstName: "Lena", lastName: "Toth", jobTitle: "Entrance support", sectorId: "entrance", rating: 4, active: true },
    { id: "w-06", employeeCode: "2026106", username: "2026106", password: "worker123", firstName: "Mate", lastName: "Varga", jobTitle: "Cleaner", sectorId: "cleaning", rating: 2, active: true },
    { id: "w-07", employeeCode: "2026107", username: "2026107", password: "worker123", firstName: "Sara", lastName: "Farkas", jobTitle: "Floor lead", sectorId: "restaurant", rating: 5, active: true },
    { id: "w-08", employeeCode: "2026108", username: "2026108", password: "worker123", firstName: "Noel", lastName: "Balazs", jobTitle: "Server", sectorId: "restaurant", rating: 4, active: true },
    { id: "w-09", employeeCode: "2026109", username: "2026109", password: "worker123", firstName: "Bianka", lastName: "Kiss", jobTitle: "Host", sectorId: "restaurant", rating: 3, active: true },
    { id: "w-10", employeeCode: "2026110", username: "2026110", password: "worker123", firstName: "Gabor", lastName: "Pinter", jobTitle: "Runner", sectorId: "restaurant", rating: 4, active: true },
    { id: "w-11", employeeCode: "2026111", username: "2026111", password: "worker123", firstName: "Arben", lastName: "Krasniqi", jobTitle: "Security", sectorId: "security", rating: 5, active: true },
    { id: "w-12", employeeCode: "2026002", username: "2026002", password: "worker123", firstName: "Luan", lastName: "Berisha", jobTitle: "Restaurant Assistant", sectorId: "restaurant", rating: 4, active: true },
    { id: "w-13", employeeCode: "2026113", username: "2026113", password: "worker123", firstName: "Reka", lastName: "Biro", jobTitle: "Cashier", sectorId: "entrance", rating: 3, active: true },
    { id: "w-14", employeeCode: "2026114", username: "2026114", password: "worker123", firstName: "Oliver", lastName: "Lakatos", jobTitle: "Slide Lead", sectorId: "slides", rating: 4, active: true },
    { id: "w-15", employeeCode: "2026115", username: "2026115", password: "worker123", firstName: "Tamas", lastName: "Varga", jobTitle: "Restaurant Server", sectorId: "restaurant", rating: 3, active: true },
    { id: "w-16", employeeCode: "2026116", username: "2026116", password: "worker123", firstName: "Judit", lastName: "Fodor", jobTitle: "Pool Support", sectorId: "pool-area", rating: 4, active: true },
    { id: "w-17", employeeCode: "2026117", username: "2026117", password: "worker123", firstName: "Bence", lastName: "Toth", jobTitle: "Security Lead", sectorId: "security", rating: 5, active: true },
    { id: "w-18", employeeCode: "2026118", username: "2026118", password: "worker123", firstName: "Anna", lastName: "Major", jobTitle: "Cleaner", sectorId: "cleaning", rating: 4, active: true },
    { id: "w-19", employeeCode: "2026119", username: "2026119", password: "worker123", firstName: "Mark", lastName: "Nemeth", jobTitle: "Security", sectorId: "security", rating: 4, active: true },
    { id: "w-20", employeeCode: "2026120", username: "2026120", password: "worker123", firstName: "Eszter", lastName: "Varga", jobTitle: "Cleaner", sectorId: "cleaning", rating: 3, active: true },
  ],
  demandSettings: {
    "Very Hot / Excellent pool weather": 100,
    Hot: 90,
    Warm: 75,
    Normal: 55,
    "Weak weather": 35,
    "Rain / Cold": 20,
  },
  leaveBufferOnFullDemand: false,
  selectedCity: "Prishtina",
  assignments: [
    { id: "a-01", date: getTodayIso(), sectorId: "restaurant", workerId: "w-01", shift: 1 },
    { id: "a-02", date: getTodayIso(), sectorId: "restaurant", workerId: "w-12", shift: 2 },
    { id: "a-03", date: getTodayIso(), sectorId: "pool-area", workerId: "w-02", shift: 1 },
    { id: "a-04", date: getTodayIso(), sectorId: "pool-area", workerId: "w-03", shift: 2 },
    { id: "a-05", date: getNextFiveDays()[1], sectorId: "restaurant", workerId: "w-01", shift: 1 },
    { id: "a-06", date: getNextFiveDays()[1], sectorId: "restaurant", workerId: "w-15", shift: 2 },
  ],
  clockLogs: [],
  manualHourAdjustments: [],
};

function getTodayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getNextFiveDays(startDate = getTodayIso()) {
  const start = new Date(`${startDate}T00:00:00`);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function getWorkersBySector(workers: Worker[], sectorId: string, activeOnly = false) {
  return workers.filter(
    (worker) => worker.sectorId === sectorId && (!activeOnly || worker.active),
  );
}

function getWorkerDisplayName(worker: Worker) {
  return `${worker.firstName} ${worker.lastName}`.trim();
}

function getSectorName(sectors: Sector[], sectorId: string) {
  return sectors.find((sector) => sector.id === sectorId)?.name ?? "No sector";
}

function getAssignmentsForDateAndSector(
  assignments: Assignments,
  date: string,
  sectorId: string,
) {
  return assignments.filter(
    (assignment) => assignment.date === date && assignment.sectorId === sectorId,
  );
}

function getShiftLabel(shift: ShiftNumber) {
  return shift === 1 ? "1st Shift" : "2nd Shift";
}

function formatScheduleDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T00:00:00`));
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function getDatesInRange(dateFrom: string, dateTo: string) {
  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function getWorkerDayLogs(clockLogs: ClockLog[], workerId: string, date: string) {
  return clockLogs
    .filter((log) => log.workerId === workerId && log.date === date)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function getActiveClockSession(clockLogs: ClockLog[], workerId: string, date: string) {
  const logs = getWorkerDayLogs(clockLogs, workerId, date);
  return logs.at(-1)?.type === "CLOCK_IN" ? logs.at(-1) : undefined;
}

function hasClockedOutToday(clockLogs: ClockLog[], workerId: string, date: string) {
  return getWorkerDayLogs(clockLogs, workerId, date).some((log) => log.type === "CLOCK_OUT");
}

function calculateWorkedMinutes(clockLogs: ClockLog[], workerId: string, date: string) {
  const logs = getWorkerDayLogs(clockLogs, workerId, date);
  let openClockIn: ClockLog | undefined;
  let total = 0;

  logs.forEach((log) => {
    if (log.type === "CLOCK_IN") {
      openClockIn = log;
      return;
    }

    if (log.type === "CLOCK_OUT" && openClockIn) {
      total += Math.max(
        0,
        Math.round((new Date(log.timestamp).getTime() - new Date(openClockIn.timestamp).getTime()) / 60000),
      );
      openClockIn = undefined;
    }
  });

  if (openClockIn) {
    total += Math.max(
      0,
      Math.round((Date.now() - new Date(openClockIn.timestamp).getTime()) / 60000),
    );
  }

  return total;
}

function calculateWorkerRangeMinutes(clockLogs: ClockLog[], workerId: string, dateFrom: string, dateTo: string) {
  return getDatesInRange(dateFrom, dateTo).reduce(
    (total, date) => total + calculateWorkedMinutes(clockLogs, workerId, date),
    0,
  );
}

function getManualHourAdjustment(
  adjustments: ManualHourAdjustment[],
  workerId: string,
  dateFrom: string,
  dateTo: string,
) {
  return adjustments.find(
    (adjustment) =>
      adjustment.workerId === workerId &&
      adjustment.dateFrom === dateFrom &&
      adjustment.dateTo === dateTo,
  );
}

function calculatePayrollMinutes(
  clockLogs: ClockLog[],
  adjustments: ManualHourAdjustment[],
  workerId: string,
  dateFrom: string,
  dateTo: string,
) {
  return (
    getManualHourAdjustment(adjustments, workerId, dateFrom, dateTo)?.totalMinutes ??
    calculateWorkerRangeMinutes(clockLogs, workerId, dateFrom, dateTo)
  );
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function migrateAssignments(assignments: Assignments | LegacyAssignments | unknown): Assignments {
  if (Array.isArray(assignments)) {
    return assignments
      .filter((assignment): assignment is Partial<StaffingAssignment> =>
        Boolean(
          assignment &&
            typeof assignment === "object" &&
            "date" in assignment &&
            "sectorId" in assignment &&
            "workerId" in assignment,
        ),
      )
      .map((assignment, index) => ({
        id: assignment.id ?? `migrated-${assignment.date}-${assignment.sectorId}-${assignment.workerId}-${index}`,
        date: assignment.date ?? getTodayIso(),
        sectorId: assignment.sectorId ?? "",
        workerId: assignment.workerId ?? "",
        shift: assignment.shift === 2 ? 2 : 1,
      }));
  }

  if (assignments && typeof assignments === "object") {
    return Object.entries(assignments as LegacyAssignments).flatMap(([key, workerIds], keyIndex) => {
      const [date, sectorId] = key.split(":");

      if (!date || !sectorId || !Array.isArray(workerIds)) {
        return [];
      }

      return workerIds.map((workerId, workerIndex) => ({
        id: `legacy-${date}-${sectorId}-${workerId}-${keyIndex}-${workerIndex}`,
        date,
        sectorId,
        workerId,
        shift: 1 as ShiftNumber,
      }));
    });
  }

  return [];
}

function migrateAppState(saved: AppState): AppState {
  const workers = (saved.workers ?? initialState.workers).map((worker, index) => {
    const legacyWorker = worker as Worker & { name?: string; role?: string };
    const nameParts = (legacyWorker.name ?? "").trim().split(/\s+/);
    const fallback = initialState.workers[index];
    const employeeCode =
      legacyWorker.employeeCode ?? fallback?.employeeCode ?? `2026${String(index + 1).padStart(3, "0")}`;

    const defaultPassword =
      employeeCode === "2026001" && legacyWorker.password === "worker123"
        ? "diar123"
        : legacyWorker.password ?? fallback?.password ?? "worker123";

    return {
      ...legacyWorker,
      employeeCode,
      username: legacyWorker.username ?? employeeCode,
      password: defaultPassword,
      firstName: legacyWorker.firstName ?? nameParts[0] ?? fallback?.firstName ?? "Worker",
      lastName: legacyWorker.lastName ?? nameParts.slice(1).join(" ") ?? fallback?.lastName ?? `${index + 1}`,
      jobTitle: legacyWorker.jobTitle ?? legacyWorker.role ?? fallback?.jobTitle ?? "Worker",
      rating: legacyWorker.rating ?? 3,
      active: legacyWorker.active ?? true,
    };
  });

  return {
    ...initialState,
    ...saved,
    sectors: saved.sectors ?? initialState.sectors,
    workers,
    demandSettings: {
      ...initialState.demandSettings,
      ...(saved.demandSettings ?? {}),
    },
    selectedCity: saved.selectedCity ?? initialState.selectedCity,
    assignments: migrateAssignments(saved.assignments),
    clockLogs: saved.clockLogs ?? initialState.clockLogs,
    manualHourAdjustments: saved.manualHourAdjustments ?? initialState.manualHourAdjustments,
  };
}

function saveJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function loadSavedAccount() {
  const username = loadJson<string | null>(SESSION_KEY, null);
  if (!username) {
    return null;
  }

  const savedState = migrateAppState(loadJson(STORAGE_KEY, initialState));
  const worker = savedState.workers.find((item) => item.username === username && item.active);

  if (worker) {
    return {
      email: `${worker.username}@poolwfm.local`,
      username: worker.username,
      password: worker.password,
      role: "worker" as Role,
      name: getWorkerDisplayName(worker),
      workerId: worker.id,
    };
  }

  return accounts.find((account) => account.username === username) ?? null;
}

function useMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function useWeatherForecast(city: string, date: string) {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (!active) {
        return;
      }

      setIsLoading(true);
      setForecast(null);
      setError("");
    }, 0);

    fetch(`/api/weather?city=${encodeURIComponent(city)}&date=${encodeURIComponent(date)}`)
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Weather forecast is not available for this date.");
        }

        return data as WeatherForecast;
      })
      .then((nextForecast) => {
        if (!active) {
          return;
        }

        setForecast(nextForecast);
        setError("");
      })
      .catch((caughtError: Error) => {
        if (!active) {
          return;
        }

        setForecast(null);
        setError(caughtError.message);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [city, date]);

  return { forecast, isLoading, error };
}

function useClockPermission() {
  const [canClock, setCanClock] = useState(false);
  const [detectedIp, setDetectedIp] = useState<string | null>(null);
  const [clockAccess, setClockAccess] = useState<"allowed" | "blocked">("blocked");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (active) {
        setIsLoading(true);
      }
    }, 0);

    fetch("/api/clock/status")
      .then((response) => response.json())
      .then(
        (data: {
          canClock: boolean;
          detectedIp: string | null;
          clockAccess?: "allowed" | "blocked";
        }) => {
        if (!active) {
          return;
        }

        setCanClock(data.canClock);
        setDetectedIp(data.detectedIp);
        setClockAccess(data.clockAccess ?? (data.canClock ? "allowed" : "blocked"));
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, []);

  return { canClock, detectedIp, clockAccess, isLoading };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function SummaryCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      {note ? <p className="mt-1 text-sm text-slate-500">{note}</p> : null}
    </article>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
      <p className="font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (username: string, password: string) => string }) {
  const [username, setUsername] = useState("admin@poolwfm.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onLogin(username.trim(), password);

    if (result) {
      setError(result);
      return;
    }

    setError("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
          Pool WFM
        </p>
        <h1 className="mt-3 text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Mock login for the daily staffing list. This is not a clock-in system.
        </p>
        <form className="mt-5 flex flex-col gap-4" onSubmit={submitLogin}>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
          {error ? <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
          <button
            type="submit"
            className="h-11 rounded-md bg-cyan-700 text-sm font-bold text-white transition hover:bg-cyan-800"
          >
            Login
          </button>
        </form>
        <div className="mt-5 grid gap-2 text-xs text-slate-500">
          <p>admin@poolwfm.local / admin123</p>
          <p>2026001 / diar123</p>
        </div>
      </section>
    </main>
  );
}

function AppHeader({
  account,
  activeTab,
  onChangeTab,
  onLogout,
}: {
  account: Account;
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
  onLogout: () => void;
}) {
  const tabs =
    account.role === "admin"
      ? [
          { id: "dashboard" as Tab, label: "Dashboard" },
          { id: "sectors" as Tab, label: "Sectors" },
          { id: "workers" as Tab, label: "Workers" },
          { id: "staffing" as Tab, label: "Staffing" },
          { id: "hours" as Tab, label: "Hours" },
          { id: "settings" as Tab, label: "Settings" },
        ]
      : [{ id: "worker" as Tab, label: "My schedule" }];

  return (
    <header className="rounded-lg bg-cyan-800 p-4 text-white shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            Pool WFM
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Daily staffing list</h1>
          <p className="mt-2 text-sm text-cyan-50">
            Signed in as {account.name} ({account.role})
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="h-10 rounded-md border border-white/30 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Logout
        </button>
      </div>
      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            className={`h-10 shrink-0 rounded-md px-3 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-white text-cyan-900"
                : "bg-white/10 text-cyan-50 hover:bg-white/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function DashboardView({
  state,
  selectedDate,
}: {
  state: AppState;
  selectedDate: string;
}) {
  const activeWorkers = state.workers.filter((worker) => worker.active);
  const selectedToday = state.assignments.filter(
    (assignment) => assignment.date === selectedDate,
  ).length;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard label="Total sectors" value={state.sectors.length.toString()} />
      <SummaryCard label="Active workers" value={activeWorkers.length.toString()} />
      <SummaryCard label="Selected city" value={state.selectedCity} />
      <SummaryCard label="Manual assignments" value={selectedToday.toString()} note={selectedDate} />
    </section>
  );
}

function SectorManagement({
  sectors,
  workers,
  selectedFilter,
  onFilterChange,
  onAddSector,
  onUpdateSector,
  onDeleteSector,
  message,
}: {
  sectors: Sector[];
  workers: Worker[];
  selectedFilter: string;
  onFilterChange: (sectorId: string) => void;
  onAddSector: (name: string) => void;
  onUpdateSector: (sector: Sector) => void;
  onDeleteSector: (sectorId: string) => void;
  message: string;
}) {
  const [newSectorName, setNewSectorName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const filteredWorkers =
    selectedFilter === "all" ? workers : getWorkersBySector(workers, selectedFilter);

  function addSector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSectorName.trim()) {
      return;
    }

    onAddSector(newSectorName.trim());
    setNewSectorName("");
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">Add sector</h2>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={addSector}>
          <input
            value={newSectorName}
            onChange={(event) => setNewSectorName(event.target.value)}
            placeholder="Sector name"
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700 sm:flex-1"
          />
          <button type="submit" className="h-11 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white">
            Add
          </button>
        </form>
        {message ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{message}</p> : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Filter workers by sector
          <select
            value={selectedFilter}
            onChange={(event) => onFilterChange(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          >
            <option value="all">All sectors</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-sm text-slate-500">{filteredWorkers.length} workers shown</p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {sectors.map((sector) => {
          const workerCount = getWorkersBySector(workers, sector.id).length;
          const isEditing = editingId === sector.id;

          return (
            <article key={sector.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              {isEditing ? (
                <div className="grid gap-3">
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateSector({ ...sector, name: draftName.trim() || sector.name });
                        setEditingId(null);
                      }}
                      className="h-10 rounded-md bg-cyan-700 text-sm font-bold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="h-10 rounded-md border border-slate-300 text-sm font-bold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{sector.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{workerCount} workers</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(sector.id);
                        setDraftName(sector.name);
                      }}
                      className="h-10 rounded-md border border-cyan-700 text-sm font-bold text-cyan-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSector(sector.id)}
                      className="h-10 rounded-md border border-rose-200 bg-rose-50 text-sm font-bold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function WorkerManagement({
  workers,
  sectors,
  clockLogs,
  selectedFilter,
  onFilterChange,
  onAddWorker,
  onUpdateWorker,
  onDeleteWorker,
  onAdminClock,
  warning,
}: {
  workers: Worker[];
  sectors: Sector[];
  clockLogs: ClockLog[];
  selectedFilter: string;
  onFilterChange: (sectorId: string) => void;
  onAddWorker: (worker: Omit<Worker, "id">) => boolean;
  onUpdateWorker: (worker: Worker) => void;
  onDeleteWorker: (workerId: string) => void;
  onAdminClock: (workerId: string, type: ClockLogType, actionDate: string) => Promise<void>;
  warning: string;
}) {
  const firstSector = sectors[0]?.id ?? "";
  const [newWorker, setNewWorker] = useState<WorkerForm>({
    employeeCode: "",
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    jobTitle: "",
    sectorId: firstSector,
    rating: 3,
    active: true,
    temporaryPassword: "Test123!",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Worker | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState("");

  const visibleWorkers =
    selectedFilter === "all" ? workers : getWorkersBySector(workers, selectedFilter);
  const today = getTodayIso();

  function submitWorker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !newWorker.employeeCode.trim() ||
      !newWorker.firstName.trim() ||
      !newWorker.lastName.trim() ||
      !newWorker.jobTitle.trim() ||
      !newWorker.temporaryPassword ||
      !newWorker.sectorId
    ) {
      return;
    }

    const created = onAddWorker({
      ...newWorker,
      employeeCode: newWorker.employeeCode.trim(),
      username: newWorker.employeeCode.trim(),
      password: newWorker.temporaryPassword,
      firstName: newWorker.firstName.trim(),
      lastName: newWorker.lastName.trim(),
      jobTitle: newWorker.jobTitle.trim(),
    });

    if (created) {
      setCreatedCredentials(
        `Username: ${newWorker.employeeCode.trim()} / Temporary password: ${newWorker.temporaryPassword}`,
      );
      setNewWorker({
        employeeCode: "",
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        jobTitle: "",
        sectorId: firstSector,
        rating: 3,
        active: true,
        temporaryPassword: "Test123!",
      });
    }
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">Add worker</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={submitWorker}>
          <input
            value={newWorker.employeeCode}
            onChange={(event) =>
              setNewWorker({
                ...newWorker,
                employeeCode: event.target.value,
                username: event.target.value,
              })
            }
            placeholder="Employee code"
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          />
          <input
            value={newWorker.firstName}
            onChange={(event) => setNewWorker({ ...newWorker, firstName: event.target.value })}
            placeholder="First name"
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          />
          <input
            value={newWorker.lastName}
            onChange={(event) => setNewWorker({ ...newWorker, lastName: event.target.value })}
            placeholder="Last name"
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          />
          <input
            value={newWorker.jobTitle}
            onChange={(event) => setNewWorker({ ...newWorker, jobTitle: event.target.value })}
            placeholder="Role / job title"
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          />
          <input
            value={newWorker.temporaryPassword}
            onChange={(event) =>
              setNewWorker({ ...newWorker, temporaryPassword: event.target.value })
            }
            placeholder="Temporary password"
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          />
          <select
            value={newWorker.sectorId}
            onChange={(event) => setNewWorker({ ...newWorker, sectorId: event.target.value })}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          >
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
          <select
            value={newWorker.rating}
            onChange={(event) =>
              setNewWorker({ ...newWorker, rating: Number(event.target.value) as Rating })
            }
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          >
            {[1, 2, 3, 4, 5].map((rating) => (
              <option key={rating} value={rating}>
                Rating {rating}
              </option>
            ))}
          </select>
          <label className="flex h-11 items-center justify-between rounded-md bg-slate-50 px-3 text-sm font-semibold text-slate-700">
            Active
            <input
              type="checkbox"
              checked={newWorker.active}
              onChange={(event) => setNewWorker({ ...newWorker, active: event.target.checked })}
              className="h-5 w-5 accent-cyan-700"
            />
          </label>
          <button type="submit" className="h-11 rounded-md bg-cyan-700 text-sm font-bold text-white">
            Add
          </button>
        </form>
        {warning ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{warning}</p> : null}
        {createdCredentials ? (
          <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            {createdCredentials}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Filter workers by sector
          <select
            value={selectedFilter}
            onChange={(event) => onFilterChange(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          >
            <option value="all">All sectors</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {visibleWorkers.map((worker) => {
          const sector = sectors.find((item) => item.id === worker.sectorId);
          const isEditing = editingId === worker.id && draft;
          const activeSession = getActiveClockSession(clockLogs, worker.id, today);
          const workedMinutes = calculateWorkedMinutes(clockLogs, worker.id, today);

          return (
            <article key={worker.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              {isEditing ? (
                <div className="grid gap-3">
                  <input
                    value={draft.employeeCode}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        employeeCode: event.target.value,
                        username: event.target.value,
                      })
                    }
                    placeholder="Employee code"
                    className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
                  />
                  <input
                    value={draft.username}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        username: event.target.value,
                        employeeCode: event.target.value,
                      })
                    }
                    placeholder="Username"
                    className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
                  />
                  <input
                    value={draft.password}
                    onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                    placeholder="Password"
                    className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
                  />
                  <input
                    value={draft.firstName}
                    onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
                    className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
                  />
                  <input
                    value={draft.lastName}
                    onChange={(event) => setDraft({ ...draft, lastName: event.target.value })}
                    className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
                  />
                  <input
                    value={draft.jobTitle}
                    onChange={(event) => setDraft({ ...draft, jobTitle: event.target.value })}
                    className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
                  />
                  <select
                    value={draft.sectorId}
                    onChange={(event) => setDraft({ ...draft, sectorId: event.target.value })}
                    className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
                  >
                    {sectors.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draft.rating}
                    onChange={(event) => setDraft({ ...draft, rating: Number(event.target.value) as Rating })}
                    className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>
                        Rating {rating}
                      </option>
                    ))}
                  </select>
                  <label className="flex h-11 items-center justify-between rounded-md bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                    Active
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
                      className="h-5 w-5 accent-cyan-700"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateWorker(draft);
                        setEditingId(null);
                        setDraft(null);
                      }}
                      className="h-10 rounded-md bg-cyan-700 text-sm font-bold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setDraft(null);
                      }}
                      className="h-10 rounded-md border border-slate-300 text-sm font-bold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{getWorkerDisplayName(worker)}</h3>
                      <p className="mt-1 text-sm text-slate-500">{worker.jobTitle}</p>
                      <p className="mt-1 text-sm text-slate-500">{sector?.name ?? "No sector"}</p>
                      <p className="mt-2 text-sm font-semibold text-amber-600">Rating {worker.rating}/5</p>
                      <p className="mt-2 text-sm font-semibold text-cyan-800">
                        Today: {activeSession ? "Clocked in" : "Not clocked in"} - {formatDuration(workedMinutes)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        worker.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {worker.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!worker.active || Boolean(activeSession)}
                      onClick={() => onAdminClock(worker.id, "CLOCK_IN", today)}
                      className="h-10 rounded-md bg-green-100 text-sm font-bold text-green-800 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Clock In
                    </button>
                    <button
                      type="button"
                      disabled={!worker.active || !activeSession}
                      onClick={() => onAdminClock(worker.id, "CLOCK_OUT", today)}
                      className="h-10 rounded-md bg-red-800 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Clock Out
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(worker.id);
                        setDraft({ ...worker });
                      }}
                      className="h-10 rounded-md border border-cyan-700 text-sm font-bold text-cyan-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteWorker(worker.id)}
                      className="h-10 rounded-md border border-rose-200 bg-rose-50 text-sm font-bold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}

function WeatherCard({
  city,
  date,
  forecast,
  isLoading,
  error,
}: {
  city: string;
  date: string;
  forecast: WeatherForecast | null;
  isLoading: boolean;
  error: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Weather
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">{city}</h2>
          <p className="mt-1 text-sm text-slate-500">{date}</p>
        </div>
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800">
          Open-Meteo
        </span>
      </div>

      {isLoading ? (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          Loading weather forecast...
        </p>
      ) : null}

      {!isLoading && error ? (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">{error}</p>
      ) : null}

      {!isLoading && forecast ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-slate-500">Daily maximum</p>
            <p className="mt-1 text-2xl font-bold">{Math.round(forecast.maxTemperature)}C</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-slate-500">Minimum</p>
            <p className="mt-1 text-lg font-bold">{Math.round(forecast.minTemperature)}C</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-slate-500">Condition</p>
            <p className="mt-1 text-lg font-bold">{forecast.weatherCondition}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-slate-500">Rain probability</p>
            <p className="mt-1 text-lg font-bold">{forecast.precipitationProbability}%</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StaffingView({
  state,
  selectedDate,
  selectedSectorId,
  onChangeDate,
  onChangeCity,
  onChangeSector,
  onAddWorker,
  onRemoveWorker,
  onMoveWorker,
  onAdminClock,
}: {
  state: AppState;
  selectedDate: string;
  selectedSectorId: string;
  onChangeDate: (date: string) => void;
  onChangeCity: (city: string) => void;
  onChangeSector: (sectorId: string) => void;
  onAddWorker: (workerId: string, shift: ShiftNumber) => void;
  onRemoveWorker: (workerId: string) => void;
  onMoveWorker: (workerId: string, shift: ShiftNumber) => void;
  onAdminClock: (workerId: string, type: ClockLogType, actionDate: string) => void;
}) {
  const sector = state.sectors.find((item) => item.id === selectedSectorId) ?? state.sectors[0];
  const weather = useWeatherForecast(state.selectedCity, selectedDate);

  if (!sector) {
    return <EmptyState title="No sectors yet" text="Add a sector before planning staffing." />;
  }

  const activeWorkers = getWorkersBySector(state.workers, sector.id, true);
  const selectedAssignments = getAssignmentsForDateAndSector(
    state.assignments,
    selectedDate,
    sector.id,
  );
  const shift1Assignments = selectedAssignments.filter((assignment) => assignment.shift === 1);
  const shift2Assignments = selectedAssignments.filter((assignment) => assignment.shift === 2);
  const shift1Workers = activeWorkers.filter((worker) =>
    shift1Assignments.some((assignment) => assignment.workerId === worker.id),
  );
  const shift2Workers = activeWorkers.filter((worker) =>
    shift2Assignments.some((assignment) => assignment.workerId === worker.id),
  );
  const totalAssigned = shift1Workers.length + shift2Workers.length;
  const assignedWorkers = [...shift1Workers, ...shift2Workers];
  const today = getTodayIso();
  const canEditClockRecords = selectedDate === today;

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Date
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => onChangeDate(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          City
          <select
            value={state.selectedCity}
            onChange={(event) => onChangeCity(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          >
            {kosovoCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Sector
          <select
            value={sector.id}
            onChange={(event) => onChangeSector(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          >
            {state.sectors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <WeatherCard
          city={state.selectedCity}
          date={selectedDate}
          forecast={weather.forecast}
          isLoading={weather.isLoading}
          error={weather.error}
        />
        <section className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label="Active in sector" value={`${activeWorkers.length}`} />
          <SummaryCard label="Manually assigned" value={`${totalAssigned}`} />
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Shift 1 count" value={`${shift1Workers.length}`} />
        <SummaryCard label="Shift 2 count" value={`${shift2Workers.length}`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ShiftBox
          title="1st Shift"
          workers={shift1Workers}
          emptyText="No workers assigned to Shift 1."
          className="border-green-200 bg-green-50"
          onRemove={onRemoveWorker}
        />
        <ShiftBox
          title="2nd Shift"
          workers={shift2Workers}
          emptyText="No workers assigned to Shift 2."
          className="border-amber-200 bg-amber-50"
          onRemove={onRemoveWorker}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">Admin clock override</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manual clock actions are available only for workers assigned to this date and sector.
        </p>
        {!canEditClockRecords && selectedDate < today ? (
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            This day is locked. Clock records can no longer be edited.
          </p>
        ) : null}
        {!canEditClockRecords && selectedDate > today ? (
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Clock records can only be edited on the current day.
          </p>
        ) : null}
        {assignedWorkers.length ? (
          <ul className="mt-4 grid gap-2">
            {assignedWorkers.map((worker) => {
              const activeSession = getActiveClockSession(state.clockLogs, worker.id, today);
              const workedMinutes = calculateWorkedMinutes(state.clockLogs, worker.id, today);

              return (
                <li key={worker.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold">{getWorkerDisplayName(worker)}</p>
                      <p className="mt-1 text-xs text-slate-500">{worker.jobTitle}</p>
                      <p className="mt-1 text-xs font-semibold text-cyan-800">
                        {activeSession ? "Currently clocked in" : "Not clocked in"} - {formatDuration(workedMinutes)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:min-w-64">
                      <button
                        type="button"
                        disabled={!canEditClockRecords || Boolean(activeSession)}
                        onClick={() => onAdminClock(worker.id, "CLOCK_IN", selectedDate)}
                        className="h-10 rounded-md bg-green-100 px-3 text-sm font-bold text-green-800 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Clock In
                      </button>
                      <button
                        type="button"
                        disabled={!canEditClockRecords || !activeSession}
                        onClick={() => onAdminClock(worker.id, "CLOCK_OUT", selectedDate)}
                        className="h-10 rounded-md bg-red-800 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Clock Out
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No assigned workers" text="Assign workers to Shift 1 or Shift 2 before using admin override." />
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Available workers from {sector.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Admin manually chooses Shift 1 or Shift 2. Weather is only a reference.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {activeWorkers.length}
          </span>
        </div>
        <ul className="mt-4 grid gap-2">
          {activeWorkers.map((worker) => {
            const assignment = selectedAssignments.find((item) => item.workerId === worker.id);

            return (
              <li key={worker.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{getWorkerDisplayName(worker)}</p>
                    <p className="mt-1 text-xs text-slate-500">{worker.jobTitle}</p>
                    <p className="mt-1 text-xs text-slate-500">{sector.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Status: {worker.active ? "Active" : "Inactive"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-amber-600">
                      Rating {worker.rating}/5
                    </p>
                    {assignment ? (
                      <p className="mt-2 text-sm font-bold text-cyan-800">
                        Assigned to {getShiftLabel(assignment.shift)}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:min-w-56">
                    {assignment ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onMoveWorker(worker.id, 1)}
                          disabled={assignment.shift === 1}
                          className="h-10 rounded-md border border-green-300 bg-green-50 px-3 text-sm font-bold text-green-800 disabled:opacity-45"
                        >
                          Move to 1
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveWorker(worker.id, 2)}
                          disabled={assignment.shift === 2}
                          className="h-10 rounded-md border border-amber-300 bg-amber-50 px-3 text-sm font-bold text-amber-800 disabled:opacity-45"
                        >
                          Move to 2
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveWorker(worker.id)}
                          className="col-span-2 h-10 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onAddWorker(worker.id, 1)}
                          className="h-10 rounded-md bg-green-700 px-3 text-sm font-bold text-white"
                        >
                          Add 1
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddWorker(worker.id, 2)}
                          className="h-10 rounded-md bg-amber-600 px-3 text-sm font-bold text-white"
                        >
                          Add 2
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ShiftBox({
  title,
  workers,
  emptyText,
  className,
  onRemove,
}: {
  title: string;
  workers: Worker[];
  emptyText: string;
  className: string;
  onRemove: (workerId: string) => void;
}) {
  return (
    <section className={`rounded-lg border p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
          {workers.length}
        </span>
      </div>
      {workers.length ? (
        <ul className="mt-4 grid gap-2">
          {workers.map((worker) => (
            <li key={worker.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{getWorkerDisplayName(worker)}</p>
                <p className="mt-1 text-xs text-slate-500">{worker.jobTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(worker.id)}
                className="h-10 shrink-0 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing here yet" text={emptyText} />
      )}
    </section>
  );
}

function SettingsView({ state }: { state: AppState }) {
  const duplicateEmployeeCodes = state.workers.length - new Set(state.workers.map((worker) => worker.employeeCode)).size;
  const duplicateAssignments =
    state.assignments.length -
    new Set(state.assignments.map((assignment) => `${assignment.workerId}:${assignment.date}`)).size;

  return (
    <section className="grid gap-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">Supabase migration utility</h2>
        <p className="mt-1 text-sm text-slate-500">
          Temporary admin-only checklist for importing localStorage data after Supabase is connected.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Local sectors" value={state.sectors.length.toString()} />
          <SummaryCard label="Local workers" value={state.workers.length.toString()} />
          <SummaryCard label="Shift assignments" value={state.assignments.length.toString()} />
          <SummaryCard label="Validation issues" value={`${duplicateEmployeeCodes + duplicateAssignments}`} />
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          <p>Checks before import:</p>
          <p className="mt-1">Duplicate employee codes: {duplicateEmployeeCodes}</p>
          <p>Duplicate worker/date assignments: {duplicateAssignments}</p>
          <p className="mt-3">
            The SQL migrations and seed files are included in the repository. After a real Supabase
            project is configured, this utility can be connected to secure server actions.
          </p>
        </div>
      </section>
    </section>
  );
}

function HoursView({
  state,
  onSetManualHours,
}: {
  state: AppState;
  onSetManualHours: (workerId: string, dateFrom: string, dateTo: string, totalHours: number) => void;
}) {
  const [workerFilter, setWorkerFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState(getTodayIso());
  const [dateTo, setDateTo] = useState(getTodayIso());
  const [draftHours, setDraftHours] = useState<Record<string, string>>({});

  const filteredWorkers = state.workers.filter(
    (worker) =>
      (workerFilter === "all" || worker.id === workerFilter) &&
      (sectorFilter === "all" || worker.sectorId === sectorFilter),
  );
  const payrollRows = filteredWorkers.map((worker) => {
    const loggedMinutes = calculateWorkerRangeMinutes(state.clockLogs, worker.id, dateFrom, dateTo);
    const manualAdjustment = getManualHourAdjustment(
      state.manualHourAdjustments,
      worker.id,
      dateFrom,
      dateTo,
    );
    const totalMinutes = calculatePayrollMinutes(
      state.clockLogs,
      state.manualHourAdjustments,
      worker.id,
      dateFrom,
      dateTo,
    );

    return {
      worker,
      loggedMinutes,
      totalMinutes,
      isAdjusted: Boolean(manualAdjustment),
    };
  });

  function exportCsv() {
    const rows = [
      [
        "Worker ID",
        "Worker Name",
        "Sector",
        "From Date",
        "To Date",
        "Total Hours",
      ],
      ...payrollRows.map(({ worker, totalMinutes }) => [
          worker.employeeCode,
          getWorkerDisplayName(worker),
          getSectorName(state.sectors, worker.sectorId),
          dateFrom,
          dateTo,
          (totalMinutes / 60).toFixed(2),
        ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pool-wfm-hours-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="grid gap-4">
      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Worker
          <select value={workerFilter} onChange={(event) => setWorkerFilter(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-base">
            <option value="all">All workers</option>
            {state.workers.map((worker) => (
              <option key={worker.id} value={worker.id}>
                {getWorkerDisplayName(worker)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Sector
          <select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-base">
            <option value="all">All sectors</option>
            {state.sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>{sector.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          From
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-base" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          To
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-base" />
        </label>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Payroll hours</h2>
            <p className="text-sm text-slate-500">
              Totals are calculated only for the selected From/To dates. Admin can edit each worker total.
            </p>
          </div>
          <button type="button" onClick={exportCsv} className="h-10 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white">
            Export CSV
          </button>
        </div>
        {payrollRows.length ? (
          <ul className="mt-4 grid gap-2">
            {payrollRows.map(({ worker, loggedMinutes, totalMinutes, isAdjusted }) => {
              const draftKey = `${worker.id}:${dateFrom}:${dateTo}`;
              const draftValue = draftHours[draftKey] ?? (totalMinutes / 60).toFixed(2);

              return (
                <li key={worker.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_220px_120px] md:items-end">
                    <div>
                      <p className="text-sm font-bold">{getWorkerDisplayName(worker)}</p>
                      <p className="text-xs text-slate-500">
                        {worker.employeeCode} - {getSectorName(state.sectors, worker.sectorId)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Logged: {formatDuration(loggedMinutes)}
                        {isAdjusted ? " - adjusted by admin" : ""}
                      </p>
                    </div>
                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                      Total hours
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draftValue}
                        onChange={(event) =>
                          setDraftHours((current) => ({
                            ...current,
                            [draftKey]: event.target.value,
                          }))
                        }
                        className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextHours = Number(draftValue);

                        if (Number.isNaN(nextHours) || nextHours < 0) {
                          window.alert("Enter a valid total hours number.");
                          return;
                        }

                        onSetManualHours(worker.id, dateFrom, dateTo, nextHours);
                      }}
                      className="h-11 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white"
                    >
                      Save
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No workers in filter" text="Choose another worker or sector filter." />
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">CSV columns</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
          {["Worker ID", "Worker Name", "Sector", "From Date", "To Date", "Total Hours"].map((column) => (
            <span key={column} className="rounded-md bg-slate-50 px-3 py-2 font-semibold">
              {column}
            </span>
          ))}
        </div>
      </section>
    </section>
  );
}

function WorkerClockPanel({
  worker,
  clockLogs,
  selectedDate,
  onWorkerClock,
}: {
  worker: Worker;
  clockLogs: ClockLog[];
  selectedDate: string;
  onWorkerClock: (workerId: string, type: ClockLogType, actionDate: string) => Promise<string>;
}) {
  const today = getTodayIso();
  const isTodaySelected = selectedDate === today;
  const permission = useClockPermission();
  const activeSession = getActiveClockSession(clockLogs, worker.id, today);
  const clockedOutToday = hasClockedOutToday(clockLogs, worker.id, today);
  const workedMinutes = calculateWorkedMinutes(clockLogs, worker.id, today);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canClockIn = isTodaySelected && permission.canClock && !activeSession && !clockedOutToday;
  const canClockOut = isTodaySelected && permission.canClock && Boolean(activeSession);

  async function submitClock(type: ClockLogType) {
    setIsSaving(true);
    setMessage("");

    try {
      const nextMessage = await onWorkerClock(worker.id, type, selectedDate);
      setMessage(nextMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Clock action failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Clocking
          </p>
          <h2 className="mt-2 text-xl font-bold">{getWorkerDisplayName(worker)}</h2>
          <p className="mt-1 text-sm text-slate-500">Today worked: {formatDuration(workedMinutes)}</p>
        </div>
        {activeSession ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            Clocked in
          </span>
        ) : null}
      </div>

      {!isTodaySelected ? (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Clock In/Out is only available for today.
        </p>
      ) : null}

      {isTodaySelected && !permission.canClock && !permission.isLoading ? (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Clock In/Out is available only from authorized Aqua Park networks.
        </p>
      ) : null}

      {clockedOutToday && !activeSession ? (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          You have already clocked out today. Only an admin can manually clock you in again.
        </p>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {isTodaySelected && !activeSession ? (
          <button
            type="button"
            disabled={!canClockIn || isSaving}
            onClick={() => submitClock("CLOCK_IN")}
            className="h-12 rounded-md bg-green-100 text-sm font-bold text-green-800 transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            Clock In
          </button>
        ) : null}
        {isTodaySelected && activeSession ? (
          <button
            type="button"
            disabled={!canClockOut || isSaving}
            onClick={() => submitClock("CLOCK_OUT")}
            className="h-12 rounded-md bg-red-800 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
          >
            Clock Out
          </button>
        ) : null}
      </div>

      {message ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{message}</p> : null}
      {process.env.NODE_ENV === "development" && permission.detectedIp ? (
        <p className="mt-3 text-xs text-slate-400">
          Detected IP: {permission.detectedIp} | Clock access: {permission.clockAccess}
        </p>
      ) : null}
    </section>
  );
}

function WorkerView({
  account,
  state,
  onWorkerClock,
}: {
  account: Account;
  state: AppState;
  onWorkerClock: (workerId: string, type: ClockLogType, actionDate: string) => Promise<string>;
}) {
  const worker = state.workers.find((item) => item.id === account.workerId);
  const days = getNextFiveDays();
  const [selectedSectorId, setSelectedSectorId] = useState(worker?.sectorId ?? state.sectors[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState(days[0] ?? getTodayIso());
  const weather = useWeatherForecast(state.selectedCity, selectedDate);

  if (!worker) {
    return <EmptyState title="Worker not found" text="This mock worker account needs a worker record." />;
  }

  const sector = state.sectors.find((item) => item.id === selectedSectorId);
  const assignments = getAssignmentsForDateAndSector(state.assignments, selectedDate, selectedSectorId);
  const shift1Workers = state.workers.filter((item) =>
    assignments.some((assignment) => assignment.workerId === item.id && assignment.shift === 1),
  );
  const shift2Workers = state.workers.filter((item) =>
    assignments.some((assignment) => assignment.workerId === item.id && assignment.shift === 2),
  );

  return (
    <section className="grid gap-4">
      <WorkerClockPanel
        worker={worker}
        clockLogs={state.clockLogs}
        selectedDate={selectedDate}
        onWorkerClock={onWorkerClock}
      />

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Sector
          <select
            value={selectedSectorId}
            onChange={(event) => setSelectedSectorId(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          >
            {state.sectors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          Date
          <select
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700"
          >
            {days.map((date) => (
              <option key={date} value={date}>
                {formatScheduleDate(date)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {formatScheduleDate(selectedDate)}
        </p>
        <h2 className="mt-2 text-xl font-bold">{sector?.name ?? "No sector"}</h2>
        {weather.isLoading ? <p className="mt-1 text-sm text-slate-500">Loading weather...</p> : null}
        {weather.error ? <p className="mt-1 text-sm text-amber-700">{weather.error}</p> : null}
        {weather.forecast ? (
          <p className="mt-1 text-sm text-slate-500">
            {Math.round(weather.forecast.maxTemperature)}C
          </p>
        ) : null}
      </article>

      <section className="grid gap-4 lg:grid-cols-2">
        <WorkerShiftViewer title="1st Shift" workers={shift1Workers} currentWorkerId={worker.id} />
        <WorkerShiftViewer title="2nd Shift" workers={shift2Workers} currentWorkerId={worker.id} />
      </section>
    </section>
  );
}

function WorkerShiftViewer({
  title,
  workers,
  currentWorkerId,
}: {
  title: string;
  workers: Worker[];
  currentWorkerId: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold">{title}</h2>
      {workers.length ? (
        <ul className="mt-4 grid gap-2">
          {workers.map((worker) => (
            <li key={worker.id} className="rounded-md bg-slate-50 p-3">
              <p className="text-sm font-bold">
                {getWorkerDisplayName(worker)}
                {worker.id === currentWorkerId ? " - You" : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">{worker.jobTitle}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-500">
          No workers are assigned to this shift.
        </p>
      )}
    </section>
  );
}

export default function Home() {
  const mounted = useMounted();
  const [account, setAccount] = useState<Account | null>(() => loadSavedAccount());
  const [state, setState] = useState<AppState>(() =>
    migrateAppState(loadJson(STORAGE_KEY, initialState)),
  );
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    loadSavedAccount()?.role === "worker" ? "worker" : "dashboard",
  );
  const [selectedDate, setSelectedDate] = useState(getTodayIso());
  const [selectedSectorId, setSelectedSectorId] = useState(
    () => migrateAppState(loadJson(STORAGE_KEY, initialState)).sectors[0]?.id ?? "",
  );
  const [sectorFilter, setSectorFilter] = useState("all");
  const [workerFilter, setWorkerFilter] = useState("all");
  const [sectorMessage, setSectorMessage] = useState("");
  const [workerWarning, setWorkerWarning] = useState("");

  useEffect(() => {
    if (mounted) {
      saveJson(STORAGE_KEY, state);
    }
  }, [mounted, state]);

  function login(username: string, password: string) {
    const adminAccount = accounts.find(
      (item) => item.role === "admin" && item.username === username && item.password === password,
    );

    if (adminAccount) {
      setAccount(adminAccount);
      saveJson(SESSION_KEY, adminAccount.username);
      setActiveTab("dashboard");
      return "";
    }

    const worker = state.workers.find(
      (item) => item.username === username && item.password === password && item.active,
    );

    if (!worker) {
      return "Use a valid active worker account or the admin account.";
    }

    const workerAccount: Account = {
      email: `${worker.username}@poolwfm.local`,
      username: worker.username,
      password: worker.password,
      role: "worker",
      name: getWorkerDisplayName(worker),
      workerId: worker.id,
    };

    setAccount(workerAccount);
    saveJson(SESSION_KEY, workerAccount.username);
    setActiveTab("worker");
    return "";
  }

  function logout() {
    setAccount(null);
    window.localStorage.removeItem(SESSION_KEY);
    setActiveTab("dashboard");
  }

  function addSector(name: string) {
    const baseId = slugify(name) || `sector-${Date.now()}`;
    const id = state.sectors.some((sector) => sector.id === baseId)
      ? `${baseId}-${Date.now()}`
      : baseId;

    setState((current) => ({
      ...current,
      sectors: [...current.sectors, { id, name }],
    }));
    setSectorMessage("");
  }

  function updateSector(nextSector: Sector) {
    setState((current) => ({
      ...current,
      sectors: current.sectors.map((sector) =>
        sector.id === nextSector.id ? nextSector : sector,
      ),
    }));
  }

  function deleteSector(sectorId: string) {
    if (state.workers.some((worker) => worker.sectorId === sectorId)) {
      setSectorMessage("Move or delete workers from this sector before deleting it.");
      return;
    }

    setState((current) => ({
      ...current,
      sectors: current.sectors.filter((sector) => sector.id !== sectorId),
    }));
    setSectorMessage("");
    if (selectedSectorId === sectorId) {
      setSelectedSectorId(state.sectors.find((sector) => sector.id !== sectorId)?.id ?? "");
    }
  }

  function addWorker(worker: Omit<Worker, "id">) {
    const activeCount = state.workers.filter((item) => item.active).length;

    if (state.workers.some((item) => item.employeeCode === worker.employeeCode)) {
      setWorkerWarning("Employee code already exists.");
      return false;
    }

    if (worker.active && activeCount >= MAX_ACTIVE_WORKERS) {
      setWorkerWarning("Maximum 150 workers allowed.");
      return false;
    }

    setState((current) => ({
      ...current,
      workers: [...current.workers, { ...worker, id: `w-${Date.now()}` }],
    }));
    setWorkerWarning("");
    return true;
  }

  function updateWorker(nextWorker: Worker) {
    const activeCountWithoutWorker = state.workers.filter(
      (worker) => worker.active && worker.id !== nextWorker.id,
    ).length;

    if (
      state.workers.some(
        (worker) =>
          worker.employeeCode === nextWorker.employeeCode && worker.id !== nextWorker.id,
      )
    ) {
      setWorkerWarning("Employee code already exists.");
      return;
    }

    if (nextWorker.active && activeCountWithoutWorker >= MAX_ACTIVE_WORKERS) {
      setWorkerWarning("Maximum 150 workers allowed.");
      return;
    }

    setState((current) => ({
      ...current,
      workers: current.workers.map((worker) =>
        worker.id === nextWorker.id ? nextWorker : worker,
      ),
    }));
    setWorkerWarning("");
  }

  function deleteWorker(workerId: string) {
    const confirmed = window.confirm("Delete this worker permanently?");

    if (!confirmed) {
      return;
    }

    setState((current) => {
      return {
        ...current,
        workers: current.workers.filter((worker) => worker.id !== workerId),
        assignments: current.assignments.filter(
          (assignment) => assignment.workerId !== workerId,
        ),
      };
    });
  }

  function addAssignment(workerId: string, shift: ShiftNumber) {
    setState((current) => {
      const existingSameDay = current.assignments.some(
        (assignment) => assignment.workerId === workerId && assignment.date === selectedDate,
      );

      if (existingSameDay) {
        return current;
      }

      return {
        ...current,
        assignments: [
          ...current.assignments,
          {
            id: `a-${Date.now()}-${workerId}`,
            date: selectedDate,
            sectorId: selectedSectorId,
            workerId,
            shift,
          },
        ],
      };
    });
  }

  function removeAssignment(workerId: string) {
    setState((current) => ({
      ...current,
      assignments: current.assignments.filter(
        (assignment) =>
          !(
            assignment.workerId === workerId &&
            assignment.date === selectedDate &&
            assignment.sectorId === selectedSectorId
          ),
      ),
    }));
  }

  function moveAssignment(workerId: string, shift: ShiftNumber) {
    setState((current) => ({
      ...current,
      assignments: current.assignments.map((assignment) =>
        assignment.workerId === workerId &&
        assignment.date === selectedDate &&
        assignment.sectorId === selectedSectorId
          ? { ...assignment, shift }
          : assignment,
      ),
    }));
  }

  async function workerClock(workerId: string, type: ClockLogType, actionDate: string) {
    const today = getTodayIso();
    const worker = state.workers.find((item) => item.id === workerId);

    if (!worker) {
      throw new Error("Worker not found.");
    }

    if (actionDate !== today) {
      throw new Error("Clock In/Out is only available for today.");
    }

    if (type === "CLOCK_IN") {
      if (getActiveClockSession(state.clockLogs, workerId, today)) {
        throw new Error("You are already clocked in.");
      }

      if (hasClockedOutToday(state.clockLogs, workerId, today)) {
        throw new Error("You have already clocked out today. Ask an admin to clock you in again.");
      }
    }

    if (type === "CLOCK_OUT" && !getActiveClockSession(state.clockLogs, workerId, today)) {
      throw new Error("You are not currently clocked in.");
    }

    const response = await fetch("/api/clock/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId,
        type,
        actionDate,
        role: "worker",
        workerExists: Boolean(worker),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error ?? "Clock action is not allowed.");
    }

    setState((current) => ({
      ...current,
      clockLogs: [...current.clockLogs, data as ClockLog],
    }));

    return type === "CLOCK_IN" ? "Clocked in successfully." : "Clocked out successfully.";
  }

  async function adminClock(workerId: string, type: ClockLogType, actionDate: string) {
    const worker = state.workers.find((item) => item.id === workerId);
    const today = getTodayIso();

    if (!worker) {
      window.alert("Worker not found.");
      return;
    }

    if (!worker.active) {
      window.alert("Inactive workers cannot be clocked in or out.");
      return;
    }

    if (actionDate !== today) {
      window.alert("Clock records can only be edited on the current day.");
      return;
    }

    if (type === "CLOCK_IN" && getActiveClockSession(state.clockLogs, workerId, today)) {
      window.alert("This worker is already clocked in.");
      return;
    }

    if (type === "CLOCK_OUT" && !getActiveClockSession(state.clockLogs, workerId, today)) {
      window.alert("This worker is not currently clocked in.");
      return;
    }

    const response = await fetch("/api/clock/admin-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId,
        type,
        actionDate,
        role: account?.role,
        workerExists: Boolean(worker),
        workerActive: worker.active,
        createdBy: account?.username,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      window.alert(data.error ?? "Admin clock action failed.");
      return;
    }

    setState((current) => ({
      ...current,
      clockLogs: [...current.clockLogs, data as ClockLog],
    }));
  }

  function setManualHours(workerId: string, dateFrom: string, dateTo: string, totalHours: number) {
    const totalMinutes = Math.round(totalHours * 60);

    setState((current) => {
      const existingAdjustment = getManualHourAdjustment(
        current.manualHourAdjustments,
        workerId,
        dateFrom,
        dateTo,
      );
      const nextAdjustment: ManualHourAdjustment = {
        id: existingAdjustment?.id ?? `manual-hours-${Date.now()}-${workerId}`,
        workerId,
        dateFrom,
        dateTo,
        totalMinutes,
        updatedAt: new Date().toISOString(),
        updatedBy: account?.username ?? "admin",
      };

      return {
        ...current,
        manualHourAdjustments: existingAdjustment
          ? current.manualHourAdjustments.map((adjustment) =>
              adjustment.id === existingAdjustment.id ? nextAdjustment : adjustment,
            )
          : [...current.manualHourAdjustments, nextAdjustment],
      };
    });
  }

  if (!mounted) {
    return <main className="min-h-screen bg-slate-50" />;
  }

  if (!account) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <AppHeader
          account={account}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onLogout={logout}
        />

        {account.role === "admin" && activeTab === "dashboard" ? (
          <DashboardView state={state} selectedDate={selectedDate} />
        ) : null}

        {account.role === "admin" && activeTab === "sectors" ? (
          <SectorManagement
            sectors={state.sectors}
            workers={state.workers}
            selectedFilter={sectorFilter}
            onFilterChange={setSectorFilter}
            onAddSector={addSector}
            onUpdateSector={updateSector}
            onDeleteSector={deleteSector}
            message={sectorMessage}
          />
        ) : null}

        {account.role === "admin" && activeTab === "workers" ? (
          <WorkerManagement
            workers={state.workers}
            sectors={state.sectors}
            clockLogs={state.clockLogs}
            selectedFilter={workerFilter}
            onFilterChange={setWorkerFilter}
            onAddWorker={addWorker}
            onUpdateWorker={updateWorker}
            onDeleteWorker={deleteWorker}
            onAdminClock={adminClock}
            warning={workerWarning}
          />
        ) : null}

        {account.role === "admin" && activeTab === "staffing" ? (
          <StaffingView
            state={state}
            selectedDate={selectedDate}
            selectedSectorId={selectedSectorId || state.sectors[0]?.id || ""}
            onChangeDate={setSelectedDate}
            onChangeCity={(city) => setState((current) => ({ ...current, selectedCity: city }))}
            onChangeSector={setSelectedSectorId}
            onAddWorker={addAssignment}
            onRemoveWorker={removeAssignment}
            onMoveWorker={moveAssignment}
            onAdminClock={adminClock}
          />
        ) : null}

        {account.role === "admin" && activeTab === "hours" ? (
          <HoursView state={state} onSetManualHours={setManualHours} />
        ) : null}

        {account.role === "admin" && activeTab === "settings" ? (
          <SettingsView state={state} />
        ) : null}

        {account.role === "worker" ? (
          <WorkerView account={account} state={state} onWorkerClock={workerClock} />
        ) : null}
      </div>
    </main>
  );
}
