// Everything the Optimierung page needs from the backend. Uses only existing endpoints.
import { API_BASE_URL, WS_BASE_URL } from "../utils/apiBase.js";

export type HistoryPoint = { iteration: number; temperature: number; cost: number };
export type RunMode = "einfach" | "erweitert";
/**
 * The run as the server keeps it (GET /algorithm/status, and in every progress message). Rounds,
 * progress and "finished" live on the server, so every page, tab and device shows the same.
 */
export type RunStatus = {
  status: "idle" | "running" | "paused" | "finished";
  mode: RunMode;
  round: number;
  /** 0..1, never moves backwards within a run */
  progress: number;
  /** minimum seconds left, null while unknown */
  etaSeconds: number | null;
  finishReason: "no_further_gain" | "time_limit" | null;
  bestCost: number | null;
};
export type Progress = { iteration: number; temperature: number; currentCost: number; finished: boolean; run: RunStatus | null };

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE_URL}${path}`);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return (await r.json()) as T;
}
async function get(path: string): Promise<void> {
  const r = await fetch(`${API_BASE_URL}${path}`);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
}

export const algorithmApi = {
  history: () => getJson<HistoryPoint[]>("/get/algorithmHistory"),
  isRunning: () => getJson<boolean>("/isAlgorithmRunning"),
  hasRunBefore: () => getJson<boolean>("/isAlgorithmRunningAtLeastOnce"),
  status: () => getJson<RunStatus>("/algorithm/status"),
  lessonCount: async () => (await getJson<unknown[]>("/classSubjects")).length,
  stop: () => get("/stopAlgorithmAllClasses"),
  /** fresh random plan + cleared history */
  randomize: () => get("/randomize"),
  /**
   * Starts a fresh run in this mode (the server starts it hot). The backend answers only when the
   * run ends (pause, stop or Einfach finishing), so callers must not await this for UI feedback.
   */
  start: (mode: RunMode) => fetch(`${API_BASE_URL}/run/algorithmAllClasses?mode=${mode}`),
};

export type SocketStatus = "connecting" | "open" | "closed";

/** WebSocket on /algorithm/progress with automatic reconnect. */
export class ProgressSocket {
  private ws: WebSocket | null = null;
  private retry = 0;
  private stopped = false;
  constructor(
    private onProgress: (p: Progress) => void,
    private onStatus: (s: SocketStatus) => void,
  ) {
    this.connect();
  }
  private connect(): void {
    this.onStatus("connecting");
    const ws = new WebSocket(`${WS_BASE_URL}/algorithm/progress`);
    this.ws = ws;
    ws.onopen = () => { this.retry = 0; this.onStatus("open"); };
    ws.onmessage = (e: MessageEvent<string>) => {
      try { this.onProgress(JSON.parse(e.data) as Progress); } catch { /* ignore malformed frames */ }
    };
    ws.onclose = () => {
      this.onStatus("closed");
      if (this.stopped) return;
      const wait = Math.min(10000, 1000 * 2 ** this.retry++);
      setTimeout(() => this.connect(), wait);
    };
  }
  isOpen(): boolean { return this.ws?.readyState === WebSocket.OPEN; }
  send(msg: "pause" | `resume:${RunMode}` | `mode:${RunMode}` | `temperature:${number}`): boolean {
    if (!this.isOpen()) return false;
    this.ws!.send(msg);
    return true;
  }
  reconnectNow(): void { this.retry = 0; this.ws?.close(); }
  close(): void { this.stopped = true; this.ws?.close(); }
}
