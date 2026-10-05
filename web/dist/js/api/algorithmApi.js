// Everything the Optimierung page needs from the backend. Uses only existing endpoints.
import { API_BASE_URL, WS_BASE_URL } from "../utils/apiBase.js";
async function getJson(path) {
    const r = await fetch(`${API_BASE_URL}${path}`);
    if (!r.ok)
        throw new Error(`${path}: ${r.status}`);
    return (await r.json());
}
async function get(path) {
    const r = await fetch(`${API_BASE_URL}${path}`);
    if (!r.ok)
        throw new Error(`${path}: ${r.status}`);
}
export const algorithmApi = {
    history: () => getJson("/get/algorithmHistory"),
    isRunning: () => getJson("/isAlgorithmRunning"),
    hasRunBefore: () => getJson("/isAlgorithmRunningAtLeastOnce"),
    status: () => getJson("/algorithm/status"),
    lessonCount: async () => (await getJson("/classSubjects")).length,
    stop: () => get("/stopAlgorithmAllClasses"),
    /** fresh random plan + cleared history */
    randomize: () => get("/randomize"),
    /**
     * Starts a fresh run in this mode (the server starts it hot). The backend answers only when the
     * run ends (pause, stop or Einfach finishing), so callers must not await this for UI feedback.
     */
    start: (mode) => fetch(`${API_BASE_URL}/run/algorithmAllClasses?mode=${mode}`),
};
/** WebSocket on /algorithm/progress with automatic reconnect. */
export class ProgressSocket {
    onProgress;
    onStatus;
    ws = null;
    retry = 0;
    stopped = false;
    constructor(onProgress, onStatus) {
        this.onProgress = onProgress;
        this.onStatus = onStatus;
        this.connect();
    }
    connect() {
        this.onStatus("connecting");
        const ws = new WebSocket(`${WS_BASE_URL}/algorithm/progress`);
        this.ws = ws;
        ws.onopen = () => { this.retry = 0; this.onStatus("open"); };
        ws.onmessage = (e) => {
            try {
                this.onProgress(JSON.parse(e.data));
            }
            catch { /* ignore malformed frames */ }
        };
        ws.onclose = () => {
            this.onStatus("closed");
            if (this.stopped)
                return;
            const wait = Math.min(10000, 1000 * 2 ** this.retry++);
            setTimeout(() => this.connect(), wait);
        };
    }
    isOpen() { return this.ws?.readyState === WebSocket.OPEN; }
    send(msg) {
        if (!this.isOpen())
            return false;
        this.ws.send(msg);
        return true;
    }
    reconnectNow() { this.retry = 0; this.ws?.close(); }
    close() { this.stopped = true; this.ws?.close(); }
}
