import type { AvatarUrl, Username } from "../user/User.js";

export type MatchId = string;
export type MatchStatus = "scheduled" | "playing" | "finished" | "canceled";

export type MatchPosition = [number, number];

type MatchUser = {
	name: Username;
	avatar: AvatarUrl;
	Position: MatchPosition;
	point: number;
};

export type WSMatchData = {
	action: "START" | "MOVE" | "FINISH";
	user1: MatchUser;
	user2: MatchUser;
	ball: MatchPosition;
};
