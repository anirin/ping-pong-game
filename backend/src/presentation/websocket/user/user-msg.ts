import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { WSUserData } from "@domain/model/value-object/user/User.js";

export type UserIncomingMsg = {
	status: "User";
	action: "ADD" | "DELETE";
	room: RoomId;
};

export type UserOutgoingMsg = {
	status: "User";
	data: WSUserData;
};