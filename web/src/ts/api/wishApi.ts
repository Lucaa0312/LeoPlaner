import { API_BASE_URL } from "../utils/apiBase.js";
import { getJson, putJson } from "../utils/apiHelpers.js";
import type { Wish, WishProgress, WishReviewItem } from "../types/wish.js";

export function fetchWishReview(): Promise<WishReviewItem[]> {
  return getJson<WishReviewItem[]>("/wishes/review");
}

/** stores a human's version of one text's wishes; the model is not asked about it again */
export function saveWishReview(textHash: string, wishes: Wish[], unmappable: string[]): Promise<void> {
  return putJson(`/wishes/review/${textHash}`, { wishes, unmappable });
}

/** drops one text's result, so the next extraction reads it again */
export async function forgetWishReview(textHash: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/wishes/review/${textHash}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE review failed with status ${res.status}`);
}

/** starts reading the texts in the background, or reports the run that is already going */
export async function startWishExtraction(): Promise<WishProgress> {
  const res = await fetch(`${API_BASE_URL}/wishes/extract/start`, { method: "POST" });
  if (!res.ok) throw new Error(`POST extract/start failed with status ${res.status}`);
  return res.json() as Promise<WishProgress>;
}

export function fetchWishProgress(): Promise<WishProgress> {
  return getJson<WishProgress>("/wishes/extract/status");
}
