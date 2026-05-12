import { getJson } from "../utils/apiHelpers.js";
export function fetchClassSubjects() {
    return getJson("/classSubjects");
}
