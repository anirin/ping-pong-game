import type { AvatarUrl, UserId, Username } from "../user/User.js";

export type RoomId = string;

export type RoomStatus = "waiting" | "playing" | "finished";
export type RoomType = "1on1" | "multi";
export type RoomMode = "online" | "offline";
export type Role = "player" | "spectator";

export type RoomUser = {
	id: UserId;
	name: Username;
	avatar: AvatarUrl | null;
	num_win: 0;
	num_lose: 0;
};

export type WSRoomData = {
	action: "USER" | "DELETE";
	users: RoomUser[];
};
