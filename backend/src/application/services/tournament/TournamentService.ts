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

import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import type { TournamentRepository } from "@domain/interface/repository/tournament/TournamentRepository.js";
import { Tournament } from "@domain/model/entity/tournament/Tournament.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { MatchEntity } from "@infrastructure/entity/match/MatchEntity.js";
import { TournamentEntity } from "@infrastructure/entity/tournament/TournamentEntity.js";
import { TypeORMMatchRepository } from "@infrastructure/repository/match/TypeORMMatchRepository.js";
import { TypeORMTournamentRepository } from "@infrastructure/repository/tournament/TypeORMTournamentRepository.js";
import { v4 as uuidv4 } from "uuid";

export class TournamentService {
	private readonly tournamentRepository: TournamentRepository;
	private readonly matchRepository: MatchRepository;
	constructor() {
		this.tournamentRepository = new TypeORMTournamentRepository(
			AppDataSource.getRepository(TournamentEntity),
		);
		this.matchRepository = new TypeORMMatchRepository(
			AppDataSource.getRepository(MatchEntity),
		);
	}

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
		await this.matchRepository.saveAll(matches);

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
		const tournamentMatches =
			await this.matchRepository.findByTournamentId(tournamentId);
		tournament!.matches = tournamentMatches;
		if (!tournament) {
			throw new Error("Tournament not found");
		}
		try {
			tournament.generateNextRound();
		} catch (error) {
			console.error(error);
			throw new Error("Failed to generate next round");
		}

		// そのラウンドにあるmatches の 追加保存
		const matches = tournament.matches;
		// currentRound の matches を取得して、それを保存する
		const currentRoundMatches = matches.filter(
			(match) => match.round === tournament.currentRound,
		);
		await this.matchRepository.saveAll(currentRoundMatches);

		// 次に行う試合も送る
		const nextMatch = tournament.getNextMatch();

		return {
			tournament,
			nextMatch,
		};
	}

	async getNextMatch(tournamentId: TournamentId) {
		const tournament = await this.tournamentRepository.findById(tournamentId);
		if (!tournament) {
			throw new Error("Tournament not found");
		}
		const tournamentMatches =
			await this.matchRepository.findByTournamentId(tournamentId);
		if (!tournamentMatches) {
			throw new Error("Tournament matches not found");
		}
		tournament.matches = tournamentMatches;
		return tournament.getNextMatch();
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
