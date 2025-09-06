import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import type { TournamentRepository } from "@domain/interface/repository/tournament/TournamentRepository.js";
import { Tournament } from "@domain/model/entity/tournament/Tournament.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { MatchEntity } from "@infrastructure/entity/match/MatchEntity.js";
import { TournamentEntity } from "@infrastructure/entity/tournament/TournamentEntity.js";
import { TypeORMMatchRepository } from "@infrastructure/repository/match/TypeORMMatchRepository.js";
import { TypeORMTournamentRepository } from "@infrastructure/repository/tournament/TypeORMTournamentRepository.js";
import { wsManager } from "@presentation/websocket/ws-manager.js";
import { v4 as uuidv4 } from "uuid";

// コメント : 全体を通じて service 層は entity と db 操作双方を行って管理しているので注意が必要
export class TournamentService {
	private readonly tournamentRepository: TournamentRepository;
	private readonly matchRepository: MatchRepository;
	private readonly roomId: RoomId;

	// シングルトンインスタンスを管理するMap
	private static instances: Map<RoomId, TournamentService> = new Map();

	constructor(roomId: RoomId) {
		this.roomId = roomId;
		this.tournamentRepository = new TypeORMTournamentRepository(
			AppDataSource.getRepository(TournamentEntity),
		);
		this.matchRepository = new TypeORMMatchRepository(
			AppDataSource.getRepository(MatchEntity),
		);
	}

	// room idでシングルトンインスタンスを取得
	public static getInstance(roomId: RoomId): TournamentService {
		if (!TournamentService.instances.has(roomId)) {
			TournamentService.instances.set(roomId, new TournamentService(roomId));
		}
		return TournamentService.instances.get(roomId)!;
	}

	// インスタンスを削除（roomが削除された時など）
	public static removeInstance(roomId: RoomId): void {
		TournamentService.instances.delete(roomId);
	}

	async startTournament(
		participants: UserId[],
		room_id: RoomId,
		createdBy: UserId,
	) {
		// roomIdの検証を追加
		if (room_id !== this.roomId) {
			throw new Error(
				`Room ID mismatch: expected ${this.roomId}, got ${room_id}`,
			);
		}
		// 参加者数の検証
		if (!participants || participants.length !== 4) {
			throw new Error(
				`Tournament requires exactly 4 participants, got ${participants?.length || 0}`,
			);
		}

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

		// 対処療法
		wsManager.broadcast(room_id, {
			status: "Room",
			data: {
				action: "START",
			},
		});
	}

	async processAfterMatch(
		tournamentId: TournamentId,
		matchId: MatchId,
		winnerId: UserId,
	) {
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
			console.log("case 1 : current round に scheduled の match がある場合");

			wsManager.broadcast(this.roomId, {
				status: "Match",
				data: {
					type: "match_finished",
					matchId: matchId,
					winnerId: winnerId,
				},
			});
			return;
		}

		if (tournament!.canGenerateNextRound()) {
			// case 2 : 全て finised で next round 生成可能な場合
			console.log("case 2 : 全て finised で next round 生成可能な場合");
			tournament!.generateNextRound();

			// 各種 db 操作
			try {
				console.log("saveAll matches");
				await this.matchRepository.saveAll(tournament!.matches);
				console.log(
					"save tournament currentRound : ",
					tournament!.currentRound,
				);
				await this.tournamentRepository.save(tournament!); // ここで currentRound が更新される

				// debug
				await this.tournamentRepository.findById(tournamentId);
				console.log("tournament currentRound : ", tournament!.currentRound);
			} catch (error) {
				throw new Error("Failed to save matches");
			}
		} else {
			// case 3 : 全て finised で next round 生成不可能な場合 = tournament 終了
			// tournament finish を broadcast
			console.log(
				"case 3 : 全て finised で next round 生成不可能な場合 = tournament 終了",
			);
			this.finishTournament(tournamentId, winnerId);
		}

		if (wsManager.hasRoom(this.roomId)) {
			wsManager.broadcast(this.roomId, {
				status: "Match",
				data: {
					type: "match_finished",
					matchId: matchId,
					winnerId: winnerId,
				},
			});
		}
	}

	async finishTournament(tournamentId: TournamentId, winnerId: UserId) {
		console.log("finishTournament called with winnerId:", winnerId);

		const tournament = await this.tournamentRepository.findById(tournamentId);
		if (!tournament) {
			throw new Error("Tournament not found");
		}

		tournament.finish(winnerId);
		console.log("Tournament finished, winner_id set to:", tournament.winner_id);

		// db操作
		try {
			await this.tournamentRepository.save(tournament);
			console.log(
				"Tournament saved to database with winner_id:",
				tournament.winner_id,
			);
		} catch (error) {
			throw new Error("Failed to save tournament");
		}

		// トーナメント終了をフロントエンドに通知
		if (wsManager.hasRoom(this.roomId)) {
			console.log("Broadcasting tournament_finished with winner_id:", winnerId);
			wsManager.broadcast(this.roomId, {
				status: "Tournament",
				data: {
					type: "tournament_finished",
					winner_id: winnerId,
					tournament_id: tournamentId,
				},
			});
		}
	}

	async getTournamentStatus(roomId: RoomId) {
		// roomIdの検証を追加
		if (roomId !== this.roomId) {
			throw new Error(
				`Room ID mismatch: expected ${this.roomId}, got ${roomId}`,
			);
		}
		try {
			const tournament = await this.tournamentRepository.findByRoomId(roomId);
			if (!tournament) {
				throw new Error("Tournament not found for this room");
			}

			console.log(
				"get status : tournament currentRound : ",
				tournament.currentRound,
			);

			if (tournament.status === "finished") {
				return {
					status: tournament.status,
					next_match_id: "",
					matches: tournament.matches,
					current_round: tournament.currentRound,
					winner_id: tournament.winner_id,
				};
			}

			const matches = await this.matchRepository.findByTournamentId(
				tournament.id,
			);
			if (!matches) {
				throw new Error("Matches not found for tournament");
			}

			// マッチを更新する前に、現在のcurrentRoundを保存
			const currentRound = tournament.currentRound;
			tournament.matches = matches;
			// currentRoundを復元（データベースから取得した正しい値を使用）
			tournament.currentRound = currentRound;

			const nextMatch = tournament.getNextMatch();

			return {
				status: tournament.status,
				next_match_id: nextMatch?.id || "",
				matches: tournament.matches,
				current_round: tournament.currentRound,
				winner_id: tournament.winner_id,
			};
		} catch (error) {
			throw new Error("Failed to get tournament status");
		}
	}
}
