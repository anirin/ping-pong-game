import type {
	BallState,
	FrameState,
	MatchId,
	MatchRule,
	MatchStatus,
	PaddleState,
} from "@domain/model/value-object/match/Match.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export class Match {
	public readonly id: MatchId;
	public readonly tournamentId: TournamentId;
	public readonly player1Id: UserId;
	public readonly player2Id: UserId;
	public readonly round: number;

	public readonly rule: MatchRule;
	private _status: MatchStatus;
	private _score1: number;
	private _score2: number;
	private _winnerId: UserId | null;

	private _ballState!: BallState;
	private _paddle1State!: PaddleState;
	private _paddle2State!: PaddleState;

	constructor(
		id: MatchId,
		tournamentId: TournamentId,
		player1Id: UserId,
		player2Id: UserId,
		round: number,
		rule: MatchRule,
	) {
		this.id = id;
		this.tournamentId = tournamentId;
		this.player1Id = player1Id;
		this.player2Id = player2Id;
		this.round = round;
		this.rule = rule;

		this._status = "scheduled";
		this._score1 = 0;
		this._score2 = 0;
		this._winnerId = null;

		this.resetBallAndPaddles();
	}

	// --- Public Getters (外部から状態を安全に読み取るため) ---
	get status(): MatchStatus {
		return this._status;
	}
	get score1(): number {
		return this._score1;
	}
	get score2(): number {
		return this._score2;
	}
	get winnerId(): UserId | null {
		return this._winnerId;
	}
	get ballState(): BallState {
		return { ...this._ballState };
	} // コピーを返して内部状態を保護
	get paddle1State(): PaddleState {
		return { ...this._paddle1State };
	}
	get paddle2State(): PaddleState {
		return { ...this._paddle2State };
	}

	// --- 振る舞い (ドメインロジック) ---

	public start(): void {
		if (this._status !== "scheduled") {
			throw new Error(
				"Match cannot be started because it is not in 'scheduled' status.",
			);
		}
		this._status = "playing";
		this.resetBallAndPaddles();
	}

	public cancel(): void {
		if (this._status === "finished") {
			throw new Error("Finished match cannot be canceled.");
		}
		this._status = "canceled";
	}

	public finish(winnerId: UserId): void {
		if (this._status !== "playing") {
			throw new Error("Cannot finish a non-playing match.");
		}
		this._status = "finished";
		this._winnerId = winnerId;
	}

	public concludeByDisconnection(winnerId: UserId): void {
		if (this._status === "finished" || this._status === "canceled") {
			return;
		}
		this.finish(winnerId);
	}

	private addScore(playerId: UserId): void {
		if (this._status !== "playing") {
			throw new Error("Cannot add score to a non-playing match.");
		}

		if (playerId === this.player1Id) {
			this._score1++;
		} else if (playerId === this.player2Id) {
			this._score2++;
		}

		if (this._score1 >= this.rule.pointToWin) {
			this.finish(this.player1Id);
		} else if (this._score2 >= this.rule.pointToWin) {
			this.finish(this.player2Id);
		}
	}

	public movePaddle(playerId: UserId, y: number): void {
		if (this._status !== "playing") return;

		const fieldHeight = this.rule.fieldSize.height;
		const paddleHeight = 100;

		const newY = Math.max(
			paddleHeight / 2,
			Math.min(fieldHeight - paddleHeight / 2, y),
		);

		if (playerId === this.player1Id) {
			this._paddle1State.y = newY;
		} else if (playerId === this.player2Id) {
			this._paddle2State.y = newY;
		}
	}

	private resetBallAndPaddles(): void {
		this._ballState = {
			x: this.rule.fieldSize.width / 2,
			y: this.rule.fieldSize.height / 2,
			vx: this.rule.initialBallSpeed.vx * (Math.random() > 0.5 ? 1 : -1),
			vy: this.rule.initialBallSpeed.vy * (Math.random() > 0.5 ? 1 : -1),
		};
		this._paddle1State = { y: this.rule.fieldSize.height / 2 };
		this._paddle2State = { y: this.rule.fieldSize.height / 2 };
	}

	public advanceFrame(): void {
		if (this._status !== "playing") return;

		const currentState = {
			ball: this._ballState,
			player1Paddle: this._paddle1State,
			player2Paddle: this._paddle2State,
		};

		const { nextBallPosition, scorer } = this.calculateNextFrame(currentState);
		this._ballState = nextBallPosition;

		if (scorer) {
			const actualScorerId =
				scorer === "player1" ? this.player1Id : this.player2Id;
			this.addScore(actualScorerId);
			this.resetBallAndPaddles();
		}
	}

	private calculateNextFrame(state: FrameState): {
		nextBallPosition: BallState;
		scorer?: "player1" | "player2";
	} {
		const nextBall = { ...state.ball };
		const { player1Paddle, player2Paddle } = state;

		nextBall.x += nextBall.vx;
		nextBall.y += nextBall.vy;

		if (
			nextBall.y - this.rule.BALL_RADIUS <= 0 ||
			nextBall.y + this.rule.BALL_RADIUS >= this.rule.fieldSize.height
		) {
			nextBall.vy *= -1;
		}
		let hit = false;

		if (
			nextBall.vx < 0 &&
			nextBall.x - this.rule.BALL_RADIUS < this.rule.PADDLE_WIDTH &&
			nextBall.y > player1Paddle.y - this.rule.PADDLE_HEIGHT / 2 &&
			nextBall.y < player1Paddle.y + this.rule.PADDLE_HEIGHT / 2
		) {
			const intersectY =
				(player1Paddle.y - nextBall.y) / (this.rule.PADDLE_HEIGHT / 2);

			const MAX_BOUNCE_ANGLE = (5 * Math.PI) / 12;
			const bounceAngle = intersectY * MAX_BOUNCE_ANGLE;

			nextBall.vx = this.rule.totalSpeed * Math.cos(bounceAngle);
			nextBall.vy = this.rule.totalSpeed * -Math.sin(bounceAngle);
			hit = true;
		} else if (
			nextBall.vx > 0 &&
			nextBall.x + this.rule.BALL_RADIUS >
				this.rule.fieldSize.width - this.rule.PADDLE_WIDTH
		) {
			if (
				nextBall.y > player2Paddle.y - this.rule.PADDLE_HEIGHT / 2 &&
				nextBall.y < player2Paddle.y + this.rule.PADDLE_HEIGHT / 2
			) {
				const intersectY =
					(player2Paddle.y - nextBall.y) / (this.rule.PADDLE_HEIGHT / 2);
				const MAX_BOUNCE_ANGLE = (5 * Math.PI) / 12;
				const bounceAngle = intersectY * MAX_BOUNCE_ANGLE;

				nextBall.vx = -this.rule.totalSpeed * Math.cos(bounceAngle);
				nextBall.vy = this.rule.totalSpeed * -Math.sin(bounceAngle);
				hit = true;
			}
		}

		// ボールが壁に当たった場合 加算する処理は別関数に分けた方がいいかな？
		if (nextBall.x - this.rule.BALL_RADIUS < 0) {
			return { nextBallPosition: nextBall, scorer: "player2" };
		}
		if (nextBall.x + this.rule.BALL_RADIUS > this.rule.fieldSize.width) {
			return { nextBallPosition: nextBall, scorer: "player1" };
		}

		return { nextBallPosition: nextBall };
	}

	// ここに書いていいかは微妙だから気になる 使うべきなのか？ factory メソッドに分けた方がいいかな？
	public static reconstitute(props: {
		id: MatchId;
		tournamentId: TournamentId;
		player1Id: UserId;
		player2Id: UserId;
		round: number;
		rule: MatchRule;
		status: MatchStatus;
		score1: number;
		score2: number;
		winnerId: UserId | null;
	}): Match {
		const match = new Match(
			props.id,
			props.tournamentId,
			props.player1Id,
			props.player2Id,
			props.round,
			props.rule,
		);

		match._status = props.status;
		match._score1 = props.score1;
		match._score2 = props.score2;
		match._winnerId = props.winnerId;

		return match;
	}
}
