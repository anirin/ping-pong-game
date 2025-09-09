import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import type { Match } from "@domain/model/entity/match/Match.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { AvalancheBlockchainService } from "@infrastructure/blockchain/AvalancheBlockchainService.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { MatchEntity } from "@infrastructure/entity/match/MatchEntity.js";
import { TypeORMMatchRepository } from "@infrastructure/repository/match/TypeORMMatchRepository.js";
import { globalEventEmitter } from "@presentation/event/globalEventEmitter.js";
import type { RealtimeMatchStateDto } from "@presentation/websocket/match/match-msg.js";
import { wsManager } from "@presentation/websocket/ws-manager.js";

type Info = {
	interval: NodeJS.Timeout;
	match: Match;
};

export class MatchService {
	private intervals: Map<MatchId, Info> = new Map();
	private readonly matchRepository: MatchRepository;
	private readonly roomId: RoomId;
	private startingMatches: Set<MatchId> = new Set();
	private finishingMatches: Set<MatchId> = new Set(); // あなたが追加した素晴らしい機能
	private readyPlayers: Map<MatchId, Set<UserId>> = new Map();
	private static instances: Map<RoomId, MatchService> = new Map();

	constructor(roomId: RoomId) {
		this.roomId = roomId;
		this.matchRepository = new TypeORMMatchRepository(
			AppDataSource.getRepository(MatchEntity),
		);
	}

	// ... (getInstance, removeInstance, startMatch, stopMatch, handlePlayerInput など、他のメソッドは一切変更ありません) ...
	public static getInstance(roomId: RoomId): MatchService {
		if (!MatchService.instances.has(roomId)) {
			MatchService.instances.set(roomId, new MatchService(roomId));
		}
		return MatchService.instances.get(roomId)!;
	}

	public static removeInstance(roomId: RoomId): void {
		const instance = MatchService.instances.get(roomId);
		if (instance) {
			for (const [matchId] of instance.intervals) {
				instance.stopMatch(matchId);
			}
			MatchService.instances.delete(roomId);
		}
	}

	async startMatch(matchId: MatchId, roomId: RoomId): Promise<void> {
		if (roomId !== this.roomId) {
			throw new Error(
				`Room ID mismatch: expected ${this.roomId}, got ${roomId}`,
			);
		}
		if (this.startingMatches.has(matchId)) {
			console.log(
				`Match ${matchId} is already starting, skipping duplicate request`,
			);
			return;
		}
		if (this.intervals.has(matchId)) {
			console.log(
				`Match ${matchId} is already running, skipping duplicate request`,
			);
			return;
		}
		this.startingMatches.add(matchId);
		try {
			const match = await this.matchRepository.findById(matchId);
			if (!match) {
				throw new Error(`Match with id ${matchId} not found`);
			}
			if (match.status === "playing" || match.status === "finished") {
				console.log(
					`Match ${matchId} is already ${match.status}, skipping start`,
				);
				return;
			}
			match.start();
			console.log(`Match ${matchId} has started`);
			try {
				await this.matchRepository.save(match);
			} catch (error) {
				throw new Error("Failed to save match");
			}
			let lastScore1 = match.score1;
			let lastScore2 = match.score2;
			const interval = setInterval(async () => {
				match.advanceFrame();
				if (wsManager.hasRoom(this.roomId)) {
					const state = this.createMatchStateDto(match);
					wsManager.broadcast(this.roomId, {
						status: "Match",
						data: { type: "match_state", matchId: matchId, state: state },
					});
				}
				if (match.score1 !== lastScore1 || match.score2 !== lastScore2) {
					try {
						await this.matchRepository.save(match);
						lastScore1 = match.score1;
						lastScore2 = match.score2;
					} catch (error) {
						console.error("Failed to save match score:", error);
					}
				}
				if (match.status === "finished") {
					clearInterval(interval);
					this.intervals.delete(matchId);
					try {
						await this.finishMatch(matchId, this.roomId, match.winnerId!);
					} catch (error) {
						console.error(
							`[MatchService] Error in finishMatch for match ${matchId}:`,
							error,
						);
						throw new Error("Failed to finish match");
					}
					return;
				}
			}, 1000 / 120);
			this.intervals.set(matchId, { interval, match });
		} finally {
			this.startingMatches.delete(matchId);
		}
	}

	async stopMatch(matchId: MatchId): Promise<void> {
		const info = this.intervals.get(matchId);
		if (info) {
			clearInterval(info.interval);
			this.intervals.delete(matchId);
		}
		this.clearReadyState(matchId);
	}

	// ★★★ この `finishMatch` メソッドを丸ごと置き換えてください ★★★
	async finishMatch(
		matchId: MatchId,
		roomId: RoomId,
		winnerId: UserId,
	): Promise<void> {
		// roomIdの検証
		if (roomId !== this.roomId) {
			throw new Error(
				`Room ID mismatch: expected ${this.roomId}, got ${roomId}`,
			);
		}

		// 重複終了処理を防ぐ
		if (this.finishingMatches.has(matchId)) {
			console.log(
				`Match ${matchId} is already finishing, skipping duplicate request`,
			);
			return;
		}
		this.finishingMatches.add(matchId);

		try {
			const match = await this.matchRepository.findById(matchId);
			if (!match) {
				console.error(
					`[MatchService] Match not found for matchId: ${matchId}. Aborting finishMatch.`,
				);
				return;
			}

			if (match.status !== "finished") {
				match.finish(winnerId);
			}

			await this.matchRepository.save(match);

			(async () => {
				try {
					const finalMatchState = match;
					const blockchainService = AvalancheBlockchainService.getInstance();
					await blockchainService.recordMatchResult(
						finalMatchState.id,
						finalMatchState.tournamentId,
						finalMatchState.player1Id,
						finalMatchState.player2Id,
						finalMatchState.score1,
						finalMatchState.score2,
						finalMatchState.winnerId!,
					);
					console.log(
						`[Service] Successfully recorded match ${matchId} to blockchain.`,
					);
				} catch (err) {
					console.error(
						`[Service] Failed to record match ${matchId} to blockchain.`,
						err,
					);
				}
			})();

			// ready状態をクリア
			this.clearReadyState(matchId);

			// tournament event を発火
			const tournamentId: TournamentId = match.tournamentId;
			globalEventEmitter.emit(
				"match.finished",
				tournamentId,
				this.roomId,
				winnerId,
				matchId,
			);
		} catch (error) {
			console.error(
				`[MatchService] An unexpected error occurred in finishMatch for ${matchId}:`,
				error,
			);
		} finally {
			// 処理完了後にSetから削除
			this.finishingMatches.delete(matchId);
		}
	}

	async handlePlayerInput(
		matchId: MatchId,
		userId: UserId,
		y: number,
	): Promise<void> {
		const info = this.intervals.get(matchId);
		if (!info) {
			throw new Error(`Match ${matchId} is not active`);
		}
		if (info.match.player1Id !== userId && info.match.player2Id !== userId) {
			throw new Error(`User ${userId} is not a player in match ${matchId}`);
		}
		info.match.movePaddle(userId, y);
	}

	async isPlayer1(matchId: MatchId, userId: UserId): Promise<boolean> {
		const match = await this.matchRepository.findById(matchId);
		if (!match) {
			throw new Error(`Match with id ${matchId} not found`);
		}
		return match.player1Id === userId;
	}

	async setPlayerReady(
		matchId: MatchId,
		userId: UserId,
		isReady: boolean,
	): Promise<void> {
		const match = await this.matchRepository.findById(matchId);
		if (!match) {
			throw new Error(`Match with id ${matchId} not found`);
		}
		if (match.player1Id !== userId && match.player2Id !== userId) {
			console.log(
				`User ${userId} attempted to set ready state for match ${matchId}, but is not a player. Match players: ${match.player1Id}, ${match.player2Id}`,
			);
			throw new Error(`User ${userId} is not a player in match ${matchId}`);
		}
		if (!this.readyPlayers.has(matchId)) {
			this.readyPlayers.set(matchId, new Set());
		}
		const readySet = this.readyPlayers.get(matchId)!;
		if (isReady) {
			readySet.add(userId);
		} else {
			readySet.delete(userId);
		}
		console.log(
			`Player ${userId} ready state: ${isReady}, Total ready: ${readySet.size}/2`,
		);
		this.broadcastReadyState(matchId);
	}

	private broadcastReadyState(matchId: MatchId): void {
		const readySet = this.readyPlayers.get(matchId);
		if (!readySet) return;
		const readyPlayers = Array.from(readySet);
		const readyCount = readySet.size;
		if (wsManager.hasRoom(this.roomId)) {
			wsManager.broadcast(this.roomId, {
				status: "Match",
				data: {
					type: "ready_state",
					matchId: matchId,
					readyPlayers: readyPlayers,
					readyCount: readyCount,
				},
			});
		}
	}

	public clearReadyState(matchId: MatchId): void {
		this.readyPlayers.delete(matchId);
		console.log(`Cleared ready state for match ${matchId}`);
	}

	getReadyState(matchId: MatchId): {
		readyPlayers: UserId[];
		readyCount: number;
	} {
		const readySet = this.readyPlayers.get(matchId);
		if (!readySet) {
			return { readyPlayers: [], readyCount: 0 };
		}
		return {
			readyPlayers: Array.from(readySet),
			readyCount: readySet.size,
		};
	}

	async sendInitialMatchState(matchId: MatchId): Promise<void> {
		const match = await this.matchRepository.findById(matchId);
		if (!match) {
			throw new Error(`Match with id ${matchId} not found`);
		}
		if (wsManager.hasRoom(this.roomId)) {
			const state = this.createMatchStateDto(match);
			wsManager.broadcast(this.roomId, {
				status: "Match",
				data: { type: "match_state", matchId: matchId, state: state },
			});
		}
	}

	private createMatchStateDto(match: Match): RealtimeMatchStateDto {
		return {
			status: match.status,
			ball: { x: match.ballState.x, y: match.ballState.y },
			paddles: {
				player1: { id: match.player1Id, y: match.paddle1State.y },
				player2: { id: match.player2Id, y: match.paddle2State.y },
			},
			scores: { player1: match.score1, player2: match.score2 },
		};
	}
}
