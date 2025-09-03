import type { WSRoomData } from "@domain/model/value-object/room/Room.js";

export type RoomIncomingMsg = {
	status: "Room";
	action: "START" | "DELETE";
};

export type RoomOutgoingMsg = {
	status: "Room";
	data: WSRoomData;
} | {
	status: "Room";
	msg: string;
};
