import type { AvatarUrl, UserId, Username } from "../user/User.js";
export type MatchId = string;
export type MatchStatus = "scheduled" | "playing" | "finished" | "canceled";
export type MatchPosition = [number, number];

export type BallState = {
	x: number;
	y: number;
	vx: number;
	vy: number;
};

export type PaddleState = {
	y: number;
};

export type FrameState = {
	ball: BallState;
	player1Paddle: PaddleState;
	player2Paddle: PaddleState;
};

export class MatchRule {
	public readonly PADDLE_HEIGHT = 100;
	public readonly PADDLE_WIDTH = 10;
	public readonly BALL_RADIUS = 10;

	public readonly pointToWin: number;
	public readonly initialBallSpeed: {
		readonly vx: number;
		readonly vy: number;
	};
	public readonly fieldSize: {
		readonly width: number;
		readonly height: number;
	};
	public readonly totalSpeed: number;

	constructor(
		pointToWin: number,
		initialBallSpeed: { vx: number; vy: number },
		fieldSize: { width: number; height: number },
	) {
		if (pointToWin <= 0)
			throw new Error("pointToWin must be a positive number.");

		this.pointToWin = pointToWin;
		this.initialBallSpeed = initialBallSpeed;
		this.fieldSize = fieldSize;
		this.totalSpeed = Math.sqrt(
			initialBallSpeed.vx ** 2 + initialBallSpeed.vy ** 2,
		);
		Object.freeze(this);
	}
}

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
