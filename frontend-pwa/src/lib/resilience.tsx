import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  sparkline60,
  timeline24h,
  detailedForecast,
  forecastData,
  driftSeries,
  modelMetrics,
  initialAlerts,
  type AppAlert,
} from "@/lib/mock-data";

/**
 * The "snapshot" represents the last successful payload from the FastAPI backend.
 * Everything the dashboard renders downstream of the polling layer reads from here.
 */
export interface SensorSnapshot {
  ts: number;
  pm25: number;
  pm10: number;
  cityAvg: number;
  delta: number;
  sparkline: number[];
  timeline24h: typeof timeline24h;
  forecast: typeof forecastData;
  detailedForecast: typeof detailedForecast;
  drift: typeof driftSeries;
  modelMetrics: typeof modelMetrics;
  alerts: AppAlert[];
  regimeConfidence: number;
}

const STORAGE_KEY = "envirosense.snapshot.v1";
const POLL_INTERVAL_MS = 60_000;
const FETCH_TIMEOUT_MS = 4_000;

/** Build a fresh deterministic snapshot from the in-memory mocks. */
function buildSnapshot(tickSeed: number): SensorSnapshot {
  const r = (n: number) => (Math.sin(tickSeed * 997 + n * 13) + 1) / 2;
  const pm25 = +(8 + r(1) * 38).toFixed(1);
  const pm10 = +(pm25 + 6 + r(2) * 20).toFixed(1);
  const cityAvg = +(14 + r(3) * 26).toFixed(1);
  const delta = +(r(4) * 4 - 2).toFixed(1);
  return {
    ts: Date.now(),
    pm25,
    pm10,
    cityAvg,
    delta,
    sparkline: sparkline60,
    timeline24h,
    forecast: forecastData,
    detailedForecast,
    drift: driftSeries,
    modelMetrics,
    alerts: initialAlerts,
    regimeConfidence: +(0.7 + r(5) * 0.25).toFixed(2),
  };
}

/**
 * Simulated micro-batch fetch. In production this would hit FastAPI; here it
 * resolves with a fresh snapshot OR rejects when the developer toggle is set.
 */
function simulateFetch(tick: number, forceFail: boolean): Promise<SensorSnapshot> {
  return new Promise((resolve, reject) => {
    const latency = 180 + Math.random() * 220;
    const timer = setTimeout(() => {
      if (forceFail) {
        reject(new Error("Simulated server outage (FastAPI unreachable)"));
      } else {
        resolve(buildSnapshot(tick));
      }
    }, latency);
    // Honour timeout
    setTimeout(() => {
      clearTimeout(timer);
      reject(new Error("Request timed out"));
    }, FETCH_TIMEOUT_MS);
  });
}

function readCache(): SensorSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SensorSnapshot;
    // Minimal shape check
    if (typeof parsed?.ts !== "number" || !Array.isArray(parsed?.sparkline)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(snap: SensorSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* quota or private mode — silently ignore */
  }
}

interface ResilienceContextValue {
  snapshot: SensorSnapshot;
  isLive: boolean;
  lastSyncTs: number | null;
  failureReason: string | null;
  outageSimulated: boolean;
  setOutageSimulated: (v: boolean) => void;
  /** Force a refetch immediately. */
  refresh: () => void;
}

const ResilienceContext = createContext<ResilienceContextValue | null>(null);

export function ResilienceProvider({ children }: { children: ReactNode }) {
  // Bootstrap from cache (client) or seed snapshot (SSR-safe)
  const seed = buildSnapshot(0);
  const [snapshot, setSnapshot] = useState<SensorSnapshot>(seed);
  const [isLive, setIsLive] = useState(true);
  const [lastSyncTs, setLastSyncTs] = useState<number | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [outageSimulated, setOutageSimulated] = useState(false);
  const tickRef = useRef(0);
  const outageRef = useRef(false);
  outageRef.current = outageSimulated;

  // Hydrate from localStorage after mount
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setSnapshot(cached);
      setLastSyncTs(cached.ts);
    }
  }, []);

  const doFetch = useCallback(async () => {
    tickRef.current += 1;
    try {
      const next = await simulateFetch(tickRef.current, outageRef.current);
      setSnapshot(next);
      setIsLive(true);
      setLastSyncTs(next.ts);
      setFailureReason(null);
      writeCache(next);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown fetch error";
      setFailureReason(reason);
      setIsLive(false);
      // Fall back to cached snapshot if we somehow lost it; otherwise keep last good snapshot.
      const cached = readCache();
      if (cached) setSnapshot(cached);
    }
  }, []);

  // Initial fetch + 60s polling loop
  useEffect(() => {
    doFetch();
    const id = setInterval(doFetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [doFetch]);

  // When the dev toggle flips, immediately revalidate so the UI reacts without waiting 60s.
  useEffect(() => {
    doFetch();
  }, [outageSimulated, doFetch]);

  return (
    <ResilienceContext.Provider
      value={{
        snapshot,
        isLive,
        lastSyncTs,
        failureReason,
        outageSimulated,
        setOutageSimulated,
        refresh: doFetch,
      }}
    >
      {children}
    </ResilienceContext.Provider>
  );
}

export function useSensorData() {
  const ctx = useContext(ResilienceContext);
  if (!ctx) {
    // Provider not mounted (e.g. tests, SSR shell) — return a static snapshot
    // so consumers never crash. This is part of "graceful degradation".
    return {
      snapshot: buildSnapshot(0),
      isLive: true,
      lastSyncTs: null,
      failureReason: null,
      outageSimulated: false,
      setOutageSimulated: () => {},
      refresh: () => {},
    } satisfies ResilienceContextValue;
  }
  return ctx;
}

/** Format helper — "12s ago", "4m ago", "—" */
export function formatRelative(ts: number | null): string {
  if (!ts) return "—";
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
