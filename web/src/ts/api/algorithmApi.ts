import { getJson, getFetchResponse } from "../utils/apiHelpers.js";

export function fetchIsAlgorithmRunning(): Promise<boolean> {
    return getJson<boolean>("/isAlgorithmRunning");
}

export function fetchIsAlgorithmRunningAtLeastOnce(): Promise<boolean> {
    return getJson<boolean>("/isAlgorithmRunningAtLeastOnce");
}

// The request only returns when the run is over, so callers do not wait for it.
export function startAlgorithm(): Promise<void> {
    return getFetchResponse("/run/algorithmAllClasses");
}

export function stopAlgorithm(): Promise<void> {
    return getFetchResponse("/stopAlgorithmAllClasses");
}

export function toggleAutomaticMode(): Promise<void> {
    return getFetchResponse("/toggleAutomaticMode");
}
