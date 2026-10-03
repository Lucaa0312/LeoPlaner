import { getJson, getFetchResponse } from "../utils/apiHelpers.js";
export function fetchIsAlgorithmRunning() {
    return getJson("/isAlgorithmRunning");
}
export function fetchIsAlgorithmRunningAtLeastOnce() {
    return getJson("/isAlgorithmRunningAtLeastOnce");
}
// The request only returns when the run is over, so callers do not wait for it.
export function startAlgorithm() {
    return getFetchResponse("/run/algorithmAllClasses");
}
export function stopAlgorithm() {
    return getFetchResponse("/stopAlgorithmAllClasses");
}
export function toggleAutomaticMode() {
    return getFetchResponse("/toggleAutomaticMode");
}
