import type { RoomId } from "@domain/model/value-object/room/Room.js";

export type UserIncomingMsg = {
	status: "User";
	action: "ADD" | "DELETE";
	room: RoomId;
};