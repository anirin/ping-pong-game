import type { MatchStatus } from "@domain/model/value-object/match/Match.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export type PaddleStateDto = {
	id: UserId;
	y: number;
};

export type RealtimeMatchStateDto = {
	status: MatchStatus;
	ball: {
		x: number;
		y: number;
	};
	paddles: {
		player1: PaddleStateDto;
		player2: PaddleStateDto;
	};
	scores: {
		player1: number;
		player2: number;
	};
};
