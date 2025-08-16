import type {
	MatchId,
	MatchStatus,
} from "@domain/model/value-object/match/Match.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import {
	InvalidArgumentError,
	InvalidTransitionError,
} from "../../model/common/errors.js";


// こいつをどこにおくのかは大問題
export class MatchRule {
    public readonly pointToWin: number;

    constructor(pointToWin: number) {
        this.pointToWin = pointToWin;
    }
}

export class Match {
    public id: MatchId;
    private player1: UserId;
    private player2: UserId;
    private _score1: number = 0;
    private _score2: number = 0;
	public status: MatchStatus = "scheduled";
	public winnerId: UserId | null = null;
    private _rule: MatchRule; // 型は定義するが値として持っておく
    public round: number;
    // 完全従属なので tournament は持たせない

	constructor(
        id: MatchId,
        player1: UserId,
        player2: UserId,
        rule: MatchRule,
        round: number,
	) {
        this.id = id;
        this.player1 = player1;
        this.player2 = player2;
        this._score1 = 0;
        this._score2 = 0;
        this.status = "scheduled";
        this.winnerId = null;
        this._rule = rule;
        this.round = round;
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
        if (playerId === this.player1) this._score1++;
        else this._score2++;

        if (this._score1 >= this._rule.pointToWin) {
            this.finish(this.player1);
        } else if (this._score2 >= this._rule.pointToWin) {
            this.finish(this.player2);
        }
    }
}
