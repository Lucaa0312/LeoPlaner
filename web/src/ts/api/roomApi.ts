import { getJson, postJson, putJson } from "../utils/apiHelpers.js";
import type { CreateRoomRequest, Room } from "../types/room.js";

export function fetchRooms(): Promise<Room[]> {
    return getJson<Room[]>("/rooms");
}

export function createRoom(room: CreateRoomRequest): Promise<void> {
    return postJson<CreateRoomRequest>("/rooms", room);
}

export function updateRoom(roomId: number, room: CreateRoomRequest): Promise<void> {
    return putJson<CreateRoomRequest>(`/rooms/update/${roomId}`, room);
}
