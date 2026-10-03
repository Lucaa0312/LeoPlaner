import type { Room } from "./room.js";

// Answer of GET /api/getAllClasses
export type SchoolClass = {
  id: number;
  className: string;
  roomDTO: Room | null;
};
