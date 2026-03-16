export type RoomType = "CLASSROOM" | "EDV" | "CHEM" | "PHY" | "SPORT" | "WORKSHOP";

export type Room = {
    roomName: string;
    nameShort: string;
    roomNumber: number;
    roomPrefix: string;
    roomSuffix: string;
    roomTypes: RoomType[];
};

export type CreateRoomRequest = {
    roomName: string;
    roomNumber: number;
    nameShort: string;
    roomTypes: RoomType[];
};