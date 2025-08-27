import { Match } from "@domain/model/entity/match/Match.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import { MatchRule } from "@domain/model/value-object/match/Match.js";
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
		// 1. このトーナメントで使う試合のルールを定義
		const matchRule = new MatchRule(
			2, // pointToWin
			{ vx: 7, vy: 7 }, // initialBallSpeed
			{ width: 800, height: 600 }, // fieldSize
		);

		const matchId1: MatchId = "1";
		const matchId2: MatchId = "2";
		const tournamentId = this.id;

		if (this.participants.length !== 4) {
			throw new Error("participants must be 4");
		}

		// 2. 新しいコンストラクタのシグネチャに合わせてMatchを生成
		const matches = [
			new Match(
				matchId1,
				tournamentId, // tournamentId
				this.participants[0] ??
					(() => {
						throw new Error("Missing participant[0]");
					})(),
				this.participants[1] ??
					(() => {
						throw new Error("Missing participant[1]");
					})(),
				1, // round
				matchRule, // rule
			),
			new Match(
				matchId2,
				tournamentId, // tournamentId
				this.participants[2]!,
				this.participants[3]!,
				1, // round
				matchRule, // rule
			),
		];
		this.matches = matches;
	}

	generateNextRound() {
		// debug 全てのmatch を出力
		console.log("all matches", this.matches);
		const current_matches = this.matches.filter(
			(match) => match.round === this.currentRound,
		);

		// log で見たい
		console.log("current_matches", current_matches);
		// 全て終了していることを確認
		if (current_matches.some((match) => match.status !== "finished")) {
			throw new Error("all matches must be finished");
		}

		const matchId3: MatchId = "3";
		// 1. ルールを定義
		const matchRule = new MatchRule(
			2,
			{ vx: 7, vy: 7 },
			{ width: 800, height: 600 },
		);

		const nextRound = this.currentRound + 1;
		const tournamentId = this.id;

		// 2. 新しいコンストラクタに合わせてMatchを生成
		const finalMatch = new Match(
			matchId3,
			tournamentId, // tournamentId
			current_matches[0]!.winnerId!,
			current_matches[1]!.winnerId!,
			nextRound, // round
			matchRule, // rule
		);
		// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

		this.matches.push(finalMatch);
		this.currentRound = nextRound;
	}

	getNextMatch() {
		// currentRound かつ finished でないもを取り出す
		// 仮で2にする debug
		this.currentRound = 2;
		console.log("currentRound", this.currentRound);
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
