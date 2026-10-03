export type RoomType = "CLASSROOM" | "EDV" | "CHEM" | "PHY" | "SPORT" | "WORKSHOP";

export const ROOM_TYPES: RoomType[] = ["CLASSROOM", "EDV", "WORKSHOP", "PHY", "CHEM", "SPORT"];

export type Room = {
    id: number;
    roomName: string;
    nameShort: string;
    roomNumber: number;
    roomTypes: RoomType[];
};

export type CreateRoomRequest = {
    roomName: string;
    roomNumber: number;
    nameShort: string;
    roomTypes: RoomType[];
};
