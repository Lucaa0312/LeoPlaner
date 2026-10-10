// Where the backend lives, decided at runtime:
// - page served by Quarkus (localhost:8080, or the cloud on the default port) -> same origin
// - page served by anything else (e.g. python -m http.server 8000)            -> local backend on 8080
const DEV_BACKEND = "http://localhost:8080";
const servedByBackend = location.port === "8080" || location.port === "";
const backendOrigin = servedByBackend ? location.origin : DEV_BACKEND;
export const API_BASE_URL = `${backendOrigin}/api`;
// http -> ws, https -> wss (browsers block ws:// on https pages)
export const WS_BASE_URL = `${backendOrigin.replace(/^http/, "ws")}/api`;
