import { getJson, postJson } from "../utils/apiHelpers.js";
export function fetchRooms() {
    return getJson("/rooms");
}
export function createRoom(room) {
    return postJson("/rooms", room);
}
