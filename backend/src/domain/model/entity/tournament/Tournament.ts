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
import { v4 as uuidv4 } from "uuid"; // 本来は uuid はインフラ層で生成する

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
	generateFirstRound(): void {
		if (!this.participants || this.participants.length !== 4) {
			throw new Error(
				`Tournament requires exactly 4 participants, got ${this.participants?.length || 0}`,
			);
		}
		if (this.status !== "waiting") {
			throw new Error(
				"Cannot generate first round: tournament already started",
			);
		}
		if (this.matches.length > 0) {
			throw new Error("First round already generated");
		}

		const matchRule = new MatchRule(
			2,
			{ vx: 7, vy: 7 },
			{ width: 800, height: 600 },
		);

		// match作成は factory でやるべき
		const matches = [
			new Match(
				uuidv4(),
				this.id,
				this.participants[0]!,
				this.participants[1]!,
				1,
				matchRule,
			),
			new Match(
				uuidv4(),
				this.id,
				this.participants[2]!,
				this.participants[3]!,
				1,
				matchRule,
			),
		];

		this.matches = matches;
	}

	generateNextRound() {
		// もし current round が全て finished でなければ error （これは application で制御すべき？）
		if (!this.matches.every((match) => match.status === "finished")) {
			throw new Error(
				"Cannot generate next round: not all matches are finished",
			);
		}

		// 決勝戦が終了している場合 (current round が 1つしかない場合)
		// ここを通ることはないが一応
		if (
			this.matches.filter((match) => match.round === this.currentRound)
				.length === 1
		) {
			this.finish(this.matches[0]!.winnerId!); // service 層に tournament 終了を教える必要がある
			return;
		}

		// 通常の round generate
		const matchId3: MatchId = uuidv4();
		const matchRule = new MatchRule(
			2,
			{ vx: 7, vy: 7 },
			{ width: 800, height: 600 },
		);
		const nextRound = this.currentRound + 1;
		// 以下 filter して勝者を取得
		const current_matches = this.matches.filter(
			(match) => match.round === this.currentRound,
		);

		const finalMatch = new Match(
			matchId3,
			this.id, // tournamentId
			current_matches[0]!.winnerId!,
			current_matches[1]!.winnerId!,
			nextRound, // round
			matchRule, // rule
		);

		this.matches.push(finalMatch);
		this.currentRound = nextRound;
	}

	getNextMatch() {
		// トーナメントが終了している場合はnullを返す
		if (this.status === "finished") {
			console.log("Tournament is finished, no more matches");
			return null;
		}

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

	canGenerateNextRound(): boolean {
		// 全てfinished かつ currentRound の matches が2つ以上ある場合
		return (
			this.matches.every((match) => match.status === "finished") &&
			this.matches.filter((match) => match.round === this.currentRound)
				.length >= 2
		);
	}
}
