import { getJson, postJson, putJson } from "../utils/apiHelpers.js";
export function fetchRooms() {
    return getJson("/rooms");
}
export function createRoom(room) {
    return postJson("/rooms", room);
}
export function updateRoom(roomId, room) {
    return putJson(`/rooms/update/${roomId}`, room);
}
