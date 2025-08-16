// tournament の初期化
// tournament の開始
// tournament の次のラウンドの生成
// tournament の終了

// 適宜　tournament の状態を更新する （match依存するので問題なし）
// 開始後は全て上のメソッドは全てmatch次第 だが今回は 手動でmethodを呼ぶ

// frontendに送るべき情報
/*
user情報
match情報
tournament情報（遷移状態）
*/

import { Tournament } from "@domain/model/entity/tournament/Tournament.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import { v4 as uuidv4 } from "uuid";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentRepository } from "@domain/interface/repository/tournament/TournamentRepository.js";
import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";

export class TournamentService {
	constructor(private readonly tournamentRepository: TournamentRepository, private readonly matchRepository: MatchRepository) {}

	async startTournament(
		participants: UserId[],
		room_id: RoomId,
		createdBy: UserId,
	) {
		const tournamentId = uuidv4();
		const tournament = new Tournament(
			tournamentId,
			participants,
			createdBy,
			room_id,
		);

		// 一回戦の作成
		tournament.generateFirstRound();

		// matches の db保存
		const matches = tournament.matches;

		await this.matchRepository.save(matches);

		// tournament の db保存
		await this.tournamentRepository.save(tournament);

		// トーナメント開始
		tournament.start();

		// まず最初の試合も送る
		const nextMatch = tournament.getNextMatch();

		return {
			tournament,
			nextMatch,
		};
	}

	async generateNextRound(tournamentId: TournamentId) {
		const tournament = await this.tournamentRepository.findById(tournamentId);
		if (!tournament) {
			throw new Error("Tournament not found");
		}
		tournament.generateNextRound();

		// そのラウンドにあるmatches の 追加保存

		// 次に行う試合も送る
		const nextMatch = tournament.getNextMatch();

		return {
			tournament,
			nextMatch,
		};
	}

	async finishTournament(tournamentId: TournamentId, winnerId: UserId) {
		const tournament = await this.tournamentRepository.findById(tournamentId);
		if (!tournament) {
			throw new Error("Tournament not found");
		}
		tournament.finish(winnerId);
		await this.tournamentRepository.save(tournament);
	}
}
