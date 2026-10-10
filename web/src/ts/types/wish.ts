export type WishDegree = "LOW" | "MID" | "HIGH" | "SEVERE";

export type WishType =
  | "FREE_DAY" | "FREE_AFTERNOON" | "LATEST_END" | "EARLIEST_START" | "MAX_CONSECUTIVE" | "MAX_HOURS_PER_DAY"
  | "FEW_DAYS" | "NO_GAPS" | "LINKED_TEACHER" | "DOUBLE_PERIOD" | "ROOM";

export type WishDay = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

/** one wish as the backend prices it, see TeacherWishProfile.TeacherWish */
export type Wish = {
  type: WishType;
  degree: WishDegree;
  count?: number | null;
  hour?: number | null;
  day?: WishDay | null;
  candidates?: WishDay[] | null;
  otherTeacherName?: string | null;
  linkMode?: "SAME_DAYS" | "OPPOSITE_DAYS" | null;
  className?: string | null;
  doublePeriodMode?: "PREFER" | "AVOID" | null;
  roomName?: string | null;
  sourceSnippet?: string | null;
};

/** one teacher's wish text next to what the model made of it */
export type WishReviewItem = {
  teacherId: string;
  textHash: string;
  text: string;
  wishes: Wish[];
  unmappable: string[];
  extracted: boolean;
  reviewed: boolean;
};

export type WishProgress = { running: boolean; done: number; total: number; error: string | null };
