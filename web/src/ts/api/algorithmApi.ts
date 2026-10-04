// Everything the Optimierung page needs from the backend. Uses only existing endpoints.
import { API_BASE_URL, WS_BASE_URL } from "../utils/apiBase.js";

export type HistoryPoint = { iteration: number; temperature: number; cost: number };
export type Progress = { iteration: number; temperature: number; currentCost: number; finished: boolean };

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
  lessonCount: async () => (await getJson<unknown[]>("/classSubjects")).length,
  stop: () => get("/stopAlgorithmAllClasses"),
  /** fresh random plan + cleared history */
  randomize: () => get("/randomize"),
  toggleAutomaticMode: () => get("/toggleAutomaticMode"),
  /**
   * Starts the run. The backend answers only when the run ends (pause, stop or
   * basic mode finishing), so callers must not await this for UI feedback.
   */
  start: () => fetch(`${API_BASE_URL}/run/algorithmAllClasses`),
};

/**
 * The backend has no read endpoint for automatic (basic) mode, only a toggle.
 * We remember what we last set; a server restart resets it to off.
 * See design/redesign/BACKEND_TODO.md #6.
 */
const AUTO_KEY = "leoplaner.automaticMode";
export function believedAutomatic(): boolean {
  try { return localStorage.getItem(AUTO_KEY) === "on"; } catch { return false; }
}
/** record what the server was observed doing (it can drift from what we last set) */
export function noteAutomatic(on: boolean): void {
  try { localStorage.setItem(AUTO_KEY, on ? "on" : "off"); } catch {}
}
export async function setAutomatic(on: boolean, socket?: ProgressSocket): Promise<void> {
  if (believedAutomatic() === on) return;
  if (socket?.isOpen()) socket.send("toggleAutoMode");
  else await algorithmApi.toggleAutomaticMode();
  try { localStorage.setItem(AUTO_KEY, on ? "on" : "off"); } catch {}
}

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
  send(msg: "pause" | "resume" | "toggleAutoMode" | `temperature:${number}`): boolean {
    if (!this.isOpen()) return false;
    this.ws!.send(msg);
    return true;
  }
  reconnectNow(): void { this.retry = 0; this.ws?.close(); }
  close(): void { this.stopped = true; this.ws?.close(); }
}
