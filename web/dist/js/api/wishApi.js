import { API_BASE_URL } from "../utils/apiBase.js";
import { getJson, putJson } from "../utils/apiHelpers.js";
export function fetchWishReview() {
    return getJson("/wishes/review");
}
/** stores a human's version of one text's wishes; the model is not asked about it again */
export function saveWishReview(textHash, wishes, unmappable) {
    return putJson(`/wishes/review/${textHash}`, { wishes, unmappable });
}
/** drops one text's result, so the next extraction reads it again */
export async function forgetWishReview(textHash) {
    const res = await fetch(`${API_BASE_URL}/wishes/review/${textHash}`, { method: "DELETE" });
    if (!res.ok)
        throw new Error(`DELETE review failed with status ${res.status}`);
}
/** starts reading the texts in the background, or reports the run that is already going */
export async function startWishExtraction() {
    const res = await fetch(`${API_BASE_URL}/wishes/extract/start`, { method: "POST" });
    if (!res.ok)
        throw new Error(`POST extract/start failed with status ${res.status}`);
    return res.json();
}
export function fetchWishProgress() {
    return getJson("/wishes/extract/status");
}
