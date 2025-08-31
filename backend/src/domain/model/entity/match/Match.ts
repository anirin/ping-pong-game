import type {
	BallState,
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

	private _rule: MatchRule;
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
		this._rule = rule;

		// 永続化されるべき状態の初期化
		this._status = "scheduled";
		this._score1 = 0;
		this._score2 = 0;
		this._winnerId = null;

		// リアルタイム状態の初期化 (このメソッド内で上記プロパティが初期化される)
		this.resetRealtimeState();
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

	/** 試合を開始する */
	public start(): void {
		if (this._status !== "scheduled") {
			throw new Error(
				"Match cannot be started because it is not in 'scheduled' status.",
			);
		}
		this._status = "playing";
		this.resetRealtimeState();
	}

	public cancel(): void {
		if (this._status === "finished") {
			throw new Error("Finished match cannot be canceled.");
		}
		this._status = "canceled";
	}

	public advanceFrame(): void {
		if (this._status !== "playing") return;

		const currentState = {
			ball: this._ballState,
			player1Paddle: this._paddle1State,
			player2Paddle: this._paddle2State,
		};

		const { nextBallState, scorer } =
			this._rule.calculateNextFrame(currentState);
		this._ballState = nextBallState;

		if (scorer) {
			const actualScorerId =
				scorer === "player1" ? this.player1Id : this.player2Id;
			this.addScore(actualScorerId);
			this.resetRealtimeState();
		}
	}

	public movePaddle(playerId: UserId, y: number): void {
		if (this._status !== "playing") return;

		const fieldHeight = this._rule.fieldSize.height;
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

		if (this._score1 >= this._rule.pointToWin) {
			this.finish(this.player1Id);
		} else if (this._score2 >= this._rule.pointToWin) {
			this.finish(this.player2Id);
		}
	}

	private finish(winnerId: UserId): void {
		if (this._status !== "playing") {
			throw new Error("Cannot finish a non-playing match.");
		}
		this._status = "finished";
		this._winnerId = winnerId;
	}

	private resetRealtimeState(): void {
		this._ballState = {
			x: this._rule.fieldSize.width / 2,
			y: this._rule.fieldSize.height / 2,
			vx: this._rule.initialBallSpeed.vx * (Math.random() > 0.5 ? 1 : -1),
			vy: this._rule.initialBallSpeed.vy * (Math.random() > 0.5 ? 1 : -1),
		};
		this._paddle1State = { y: this._rule.fieldSize.height / 2 };
		this._paddle2State = { y: this._rule.fieldSize.height / 2 };
	}
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

// import type {
// 	MatchId,
// 	MatchStatus,
// } from "@domain/model/value-object/match/Match.js";
// import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
// import type { UserId } from "@domain/model/value-object/user/User.js";

// // こいつをどこにおくのかは大問題
// export class MatchRule {
// 	public readonly pointToWin: number;

// 	constructor(pointToWin: number) {
// 		this.pointToWin = pointToWin;
// 	}
// }

// export class Match {
// 	public id: MatchId;
// 	public player1: UserId;
// 	public player2: UserId;
// 	public score1: number = 0;
// 	public score2: number = 0;
// 	public status: MatchStatus = "scheduled";
// 	public winnerId: UserId | null = null;
// 	private _rule: MatchRule; // 型は定義するが値として持っておく
// 	public round: number;
// 	public tournamentId: TournamentId;

// 	constructor(
// 		id: MatchId,
// 		player1: UserId,
// 		player2: UserId,
// 		rule: MatchRule,
// 		round: number,
// 		tournamentId: TournamentId,
// 	) {
// 		this.id = id;
// 		this.player1 = player1;
// 		this.player2 = player2;
// 		this.score1 = 0;
// 		this.score2 = 0;
// 		this.status = "scheduled";
// 		this.winnerId = null;
// 		this._rule = rule;
// 		this.round = round;
// 		this.tournamentId = tournamentId;
// 	}

// 	start() {
// 		if (this.status !== "scheduled") throw new Error("invalid transition");
// 		this.status = "playing";
// 	}

// 	finish(winnerId: UserId) {
// 		if (this.status !== "playing") throw new Error("invalid transition");
// 		this.status = "finished";
// 		this.winnerId = winnerId;
// 	}

// 	addScore(playerId: UserId) {
// 		if (this.status !== "playing") throw new Error("invalid transition");
// 		if (playerId === this.player1) this.score1++;
// 		else this.score2++;

// 		if (this.score1 >= this._rule.pointToWin) {
// 			this.finish(this.player1);
// 		} else if (this.score2 >= this._rule.pointToWin) {
// 			this.finish(this.player2);
// 		}
// 	}
// }
