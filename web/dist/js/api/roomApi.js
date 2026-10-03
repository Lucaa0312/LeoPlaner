import { deleteRequest, getJson, postJson, putJson } from "../utils/apiHelpers.js";
export function fetchRooms() {
    return getJson("/rooms");
}
export function createRoom(room) {
    return postJson("/rooms", room);
}
export function updateRoom(roomId, room) {
    return putJson(`/rooms/update/${roomId}`, room);
}
export function deleteRoom(roomId) {
    return deleteRequest(`/rooms/delete/${roomId}`);
}
