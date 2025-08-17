import type {
	MatchId,
	MatchStatus,
} from "@domain/model/value-object/match/Match.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

// こいつをどこにおくのかは大問題
export class MatchRule {
	public readonly pointToWin: number;

	constructor(pointToWin: number) {
		this.pointToWin = pointToWin;
	}
}

export class Match {
	public id: MatchId;
	public player1: UserId;
	public player2: UserId;
	public score1: number = 0;
	public score2: number = 0;
	public status: MatchStatus = "scheduled";
	public winnerId: UserId | null = null;
	private _rule: MatchRule; // 型は定義するが値として持っておく
	public round: number;
	public tournamentId: TournamentId;

	constructor(
		id: MatchId,
		player1: UserId,
		player2: UserId,
		rule: MatchRule,
		round: number,
		tournamentId: TournamentId,
	) {
		this.id = id;
		this.player1 = player1;
		this.player2 = player2;
		this.score1 = 0;
		this.score2 = 0;
		this.status = "scheduled";
		this.winnerId = null;
		this._rule = rule;
		this.round = round;
		this.tournamentId = tournamentId;
	}

	start() {
		if (this.status !== "scheduled") throw new Error("invalid transition");
		this.status = "playing";
	}

	finish(winnerId: UserId) {
		if (this.status !== "playing") throw new Error("invalid transition");
		this.status = "finished";
		this.winnerId = winnerId;
	}

	addScore(playerId: UserId) {
		if (this.status !== "playing") throw new Error("invalid transition");
		if (playerId === this.player1) this.score1++;
		else this.score2++;

		if (this.score1 >= this._rule.pointToWin) {
			this.finish(this.player1);
		} else if (this.score2 >= this._rule.pointToWin) {
			this.finish(this.player2);
		}
	}
}
