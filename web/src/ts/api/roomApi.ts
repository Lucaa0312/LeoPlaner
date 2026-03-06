import { getJson, postJson } from "../utils/apiHelpers.js";
import type { CreateRoomRequest, Room } from "../types/room.js";

export function fetchRooms(): Promise<Room[]> {
    return getJson<Room[]>("/rooms");
}

export function createRoom(room: CreateRoomRequest): Promise<void> {
    return postJson<CreateRoomRequest>("/rooms", room);
}