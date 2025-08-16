import type {
	TournamentId,
	TournamentStatus,
} from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { Match, MatchRule } from "@domain/interface/sample/Match.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";

export class Tournament {
	public id: TournamentId;
	private _status: TournamentStatus = "waiting";
	public participants: UserId[] = [];
	public matches: Match[] = [];
    public winner_id: UserId | null = null;
    public currentRound: number = 1;
    // room id は完全従属なので入れない

	constructor(id: TournamentId, participants: UserId[]) {
		this.id = id;
		this._status = "waiting";
		this.participants = participants;
        this.matches = [];
        this.winner_id = null;
	}

	// トーナメントの生成
	// participants は4人と仮定する
	generateFirstRound() {
		// マッチの生成をlogicも踏まえて行う
		const matchRule = new MatchRule(2);
		const matchId1 : MatchId = "1";
		const matchId2 : MatchId = "2";

		if (this.participants.length !== 4) {
			throw new Error("participants must be 4");
		}

		// logic
		const matches = [
			new Match(matchId1, this.participants[0]!, this.participants[1]!, matchRule, 1),
			new Match(matchId2, this.participants[2]!, this.participants[3]!, matchRule, 1),
		];
		this.matches = matches;
	}

    // これはdomain service に置いていた方がいい気がする
    generateNextRound() {
        const current_matches = this.matches.filter((match) => match.round === this.currentRound);
        // 全て終了していることを確認
        if (current_matches.some((match) => match.status !== "finished")) {
            throw new Error("all matches must be finished");
        }

        const matchId3 : MatchId = "3";
        const matchRule = new MatchRule(2);

        const nextRound = this.currentRound + 1;
        const finalMatch = new Match(matchId3, current_matches[0]!.winnerId!, current_matches[1]!.winnerId!, matchRule, nextRound);

        this.matches.push(finalMatch);
        this.currentRound = nextRound;
    }

    getNextMatch() {
        // currentRound かつ finished でないもを取り出す
        const current_matches = this.matches.filter((match) => match.round === this.currentRound);
        const nextMatch = current_matches.find((match) => match.status === "scheduled");

        return nextMatch;
    }

	// トーナメントの開始
	start() {
		if (this._status !== "waiting") throw new Error("invalid transition");
		this._status = "ongoing";
	}

	// トーナメントの終了
	finish(winnerId : UserId) {
		if (this._status !== "ongoing") throw new Error("invalid transition");
		this._status = "finished";
        this.winner_id = winnerId;
	}
}
