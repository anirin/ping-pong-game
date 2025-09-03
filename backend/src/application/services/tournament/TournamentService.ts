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
import { wsManager } from "@presentation/websocket/ws-helper.js"; // やばい実装 アーキテクチャ違反には目を瞑る

// コメント : 全体を通じて service 層は entity と db 操作双方を行って管理しているので注意が必要
// todo : 全体的に broadcast の room id を持たない場合の処理がない
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

		const matches = tournament.matches;

		// matches の db保存
		try {
			await this.matchRepository.saveAll(matches);
		} catch (error) {
			throw new Error("Failed to save matches");
		}

		// トーナメント開始
		tournament.start();

		// tournament の db保存
		try {
			await this.tournamentRepository.save(tournament);
		} catch (error) {
			throw new Error("Failed to save tournament");
		}

		// まず最初の試合も送る
		const nextMatch = tournament.getNextMatch();
		if (!nextMatch) {
			throw new Error("Next match not found");
		}

		if (wsManager.hasRoom(room_id)) {
			wsManager.broadcast(room_id, {
				status: "Tournament",
				data: {
					next_match_id: nextMatch.id,
					matches: matches,
					current_round: tournament.currentRound,
					winner_id: null,
				}
			});
		}
	}

	async processAfterMatch(tournamentId: TournamentId) {
		let tournament: Tournament | null;

		try {
			tournament = await this.tournamentRepository.findById(tournamentId);
			if (!tournament) {
				throw new Error("Tournament not found");
			}
			const matches =
				await this.matchRepository.findByTournamentId(tournamentId);
			if (!matches) {
				throw new Error("Matches not found");
			}

			tournament.matches = matches;
		} catch (error) {
			throw new Error("Failed to find tournament");
		}

		// case 1 : current round に scheduled の match がある場合
		const scheduledMatch = tournament!.matches.find(
			(match) =>
				match.status === "scheduled" && match.round === tournament.currentRound,
		);
		if (scheduledMatch) {
			// broadcast
			if (wsManager.hasRoom(tournament.room_id)) {
				wsManager.broadcast(tournament.room_id, {
					status: "Tournament",
					data: {
						next_match_id: scheduledMatch.id,
						matches: tournament!.matches,
						current_round: tournament.currentRound,
						winner_id: null,
					}
				});
			}
			return;
		}

		if (tournament!.canGenerateNextRound()) {
			// case 2 : 全て finised で next round 生成可能な場合
			tournament!.generateNextRound();

			// 各種 db 操作
			try {
				await this.matchRepository.saveAll(tournament!.matches);
				await this.tournamentRepository.save(tournament!); // ここで currentRound が更新される
			} catch (error) {
				throw new Error("Failed to save matches");
			}

			const nextMatch = tournament!.getNextMatch();
			if (!nextMatch) {
				throw new Error("Next match not found");
			}

			if (wsManager.hasRoom(tournament.room_id)) {
				wsManager.broadcast(tournament.room_id, {
					status: "Tournament",
					data: {
						next_match_id: nextMatch.id,
						matches: tournament!.matches,
						current_round: tournament.currentRound,
						winner_id: null,
					}
				});
			}
		} else {
			// case 3 : 全て finised で next round 生成不可能な場合 = tournament 終了
			// tournament finish を broadcast
			this.finishTournament(tournamentId, tournament.winner_id!);
		}
	}

	async finishTournament(tournamentId: TournamentId, winnerId: UserId) {
		const tournament = await this.tournamentRepository.findById(tournamentId);
		if (!tournament) {
			throw new Error("Tournament not found");
		}

		tournament.finish(winnerId);

		// db操作
		try {
			await this.tournamentRepository.save(tournament);
		} catch (error) {
			throw new Error("Failed to save tournament");
		}

		// broadcast
		if (wsManager.hasRoom(tournament.room_id)) {
			wsManager.broadcast(tournament.room_id, {
				status: "Tournament",
				data: {
					next_match_id: "", // トーナメント終了のため空
					matches: tournament.matches,
					current_round: tournament.currentRound,
					winner_id: tournament.winner_id,
				}
			});
		}
	}
}
