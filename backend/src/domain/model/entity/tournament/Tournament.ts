import { Match, MatchRule } from "@domain/model/entity/match/Match.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type {
	TournamentId,
	TournamentStatus,
	TournamentType,
} from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export class Tournament {
	public id: TournamentId;
	public status: TournamentStatus = "waiting";
	public participants: UserId[] = [];
	public matches: Match[] = [];
	public winner_id: UserId | null = null;
	public currentRound: number = 1;
	public createdBy: UserId;
	public type: TournamentType;
	public room_id: RoomId;

	constructor(
		id: TournamentId,
		participants: UserId[],
		createdBy: UserId,
		room_id: RoomId,
	) {
		this.id = id;
		this.status = "waiting";
		this.participants = participants;
		this.matches = [];
		this.winner_id = null;
		this.createdBy = createdBy;
		this.type = "1on1"; // 仮定しておく
		this.room_id = room_id;
	}

	// トーナメントの生成
	// participants は4人と仮定する
	generateFirstRound() {
		// マッチの生成をlogicも踏まえて行う
		const matchRule = new MatchRule(2);
		const matchId1: MatchId = "1";
		const matchId2: MatchId = "2";
		const tournamentId = this.id;

		if (this.participants.length !== 4) {
			throw new Error("participants must be 4");
		}

		// logic
		const matches = [
			new Match(
				matchId1,
				this.participants[0]!,
				this.participants[1]!,
				matchRule,
				1,
				tournamentId,
			),
			new Match(
				matchId2,
				this.participants[2]!,
				this.participants[3]!,
				matchRule,
				1,
				tournamentId,
			),
		];
		this.matches = matches;
	}

	// これはdomain service に置いていた方がいい気がする
	generateNextRound() {
		const current_matches = this.matches.filter(
			(match) => match.round === this.currentRound,
		);
		// 全て終了していることを確認
		if (current_matches.some((match) => match.status !== "finished")) {
			throw new Error("all matches must be finished");
		}

		const matchId3: MatchId = "3";
		const matchRule = new MatchRule(2);

		const nextRound = this.currentRound + 1;
		const tournamentId = this.id;
		const finalMatch = new Match(
			matchId3,
			current_matches[0]!.winnerId!,
			current_matches[1]!.winnerId!,
			matchRule,
			nextRound,
			tournamentId,
		);

		this.matches.push(finalMatch);
		this.currentRound = nextRound;
	}

	getNextMatch() {
		// currentRound かつ finished でないもを取り出す
		const current_matches = this.matches.filter(
			(match) => match.round === this.currentRound,
		);
		const nextMatch = current_matches.find(
			(match) => match.status === "scheduled",
		);

		return nextMatch;
	}

	// トーナメントの開始
	start() {
		if (this.status !== "waiting") throw new Error("invalid transition");
		this.status = "ongoing";
	}

	// トーナメントの終了
	finish(winnerId: UserId) {
		if (this.status !== "ongoing") throw new Error("invalid transition");
		this.status = "finished";
		this.winner_id = winnerId;
	}
}
