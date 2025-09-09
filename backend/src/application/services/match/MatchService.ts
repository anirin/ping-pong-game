import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import type { Match } from "@domain/model/entity/match/Match.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { MatchEntity } from "@infrastructure/entity/match/MatchEntity.js";
import { TypeORMMatchRepository } from "@infrastructure/repository/match/TypeORMMatchRepository.js";
import { globalEventEmitter } from "@presentation/event/globalEventEmitter.js"; // 逆転しているやばい実装だが致し方なし
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

	// 重複実行を防ぐためのSet
	private startingMatches: Set<MatchId> = new Set();

	// 重複終了処理を防ぐためのSet
	private finishingMatches: Set<MatchId> = new Set();

	// ready状態を管理するMap (matchId -> Set<UserId>)
	private readyPlayers: Map<MatchId, Set<UserId>> = new Map();

	// シングルトンインスタンスを管理するMap
	private static instances: Map<RoomId, MatchService> = new Map();

	constructor(roomId: RoomId) {
		this.roomId = roomId;
		this.matchRepository = new TypeORMMatchRepository(
			AppDataSource.getRepository(MatchEntity),
		);
	}

	// room idでシングルトンインスタンスを取得
	public static getInstance(roomId: RoomId): MatchService {
		if (!MatchService.instances.has(roomId)) {
			MatchService.instances.set(roomId, new MatchService(roomId));
		}
		return MatchService.instances.get(roomId)!;
	}

	// インスタンスを削除（roomが削除された時など）
	public static removeInstance(roomId: RoomId): void {
		const instance = MatchService.instances.get(roomId);
		if (instance) {
			// 全てのmatchを停止
			for (const [matchId] of instance.intervals) {
				instance.stopMatch(matchId);
			}
			MatchService.instances.delete(roomId);
		}
	}

	async startMatch(matchId: MatchId, roomId: RoomId): Promise<void> {
		// roomIdの検証を追加
		if (roomId !== this.roomId) {
			throw new Error(
				`Room ID mismatch: expected ${this.roomId}, got ${roomId}`,
			);
		}

		// 重複実行を防ぐ
		if (this.startingMatches.has(matchId)) {
			console.log(
				`Match ${matchId} is already starting, skipping duplicate request`,
			);
			return;
		}

		// 既に実行中のマッチがある場合は処理をスキップ
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

			// 既に開始済みまたは終了済みの場合は処理をスキップ
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

			// マッチ開始をブロードキャスト
			if (wsManager.hasRoom(this.roomId)) {
				wsManager.broadcast(this.roomId, {
					status: "Match",
					data: {
						type: "match_started",
						matchId: matchId,
					},
				});
			}

			// 60fpsでゲームループを開始
			let lastScore1 = match.score1;
			let lastScore2 = match.score2;

			const interval = setInterval(async () => {
				match.advanceFrame();

				// リアルタイム状態をブロードキャスト
				if (wsManager.hasRoom(this.roomId)) {
					const state = this.createMatchStateDto(match);
					wsManager.broadcast(this.roomId, {
						status: "Match",
						data: {
							type: "match_state",
							matchId: matchId,
							state: state,
						},
					});
				}

				if (match.score1 !== lastScore1 || match.score2 !== lastScore2) {
					try {
						await this.matchRepository.save(match);
						lastScore1 = match.score1;
						lastScore2 = match.score2;
						// console.log(`Score updated: ${match.score1} - ${match.score2}`);
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
			}, 1000 / 60); // 60fps

			this.intervals.set(matchId, { interval, match });
		} finally {
			// 処理完了後にSetから削除
			this.startingMatches.delete(matchId);
		}
	}

	async stopMatch(matchId: MatchId): Promise<void> {
		const info = this.intervals.get(matchId);
		if (info) {
			clearInterval(info.interval);
			this.intervals.delete(matchId);
		}
		// ready状態もクリア
		this.clearReadyState(matchId);
	}

	async finishMatch(
		matchId: MatchId,
		roomId: RoomId,
		winnerId: UserId,
	): Promise<void> {
		// roomIdの検証を追加
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
				console.error(`[MatchService] Match not found for matchId: ${matchId}`);
				throw new Error("Match not found");
			}

			// 試合が終了した時点で、現在のscoreを保存
			if (match.status !== "finished") {
				match.finish(winnerId);
			}

			// データベースに保存
			let savedMatch: Match | null = null;
			try {
				await this.matchRepository.save(match);
				savedMatch = await this.matchRepository.findById(matchId);
				if (!savedMatch) {
					// 保存が失敗した場合
					console.error(
						`[MatchService] Failed to verify saved match for matchId: ${matchId}`,
					);
					throw new Error("Failed to verify saved match");
				}
			} catch (error) {
				console.error(
					`[MatchService] Database operation failed for matchId: ${matchId}:`,
					error,
				);
				throw new Error("Failed to save match");
			}

			// ready状態をクリア
			this.clearReadyState(matchId);

			// tournament event を発火
			const tournamentId: TournamentId = savedMatch.tournamentId;
			console.log(
				`MatchService : match finished tournamentId: ${tournamentId}`,
			);
			globalEventEmitter.emit(
				"match.finished",
				tournamentId,
				this.roomId,
				winnerId,
				matchId,
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

		// プレイヤーが試合に参加しているかチェック
		if (info.match.player1Id !== userId && info.match.player2Id !== userId) {
			throw new Error(`User ${userId} is not a player in match ${matchId}`);
		}

		// パドルの位置を更新
		info.match.movePaddle(userId, y);
	}

	// 指定されたユーザーがplayer1かどうかをチェック
	async isPlayer1(matchId: MatchId, userId: UserId): Promise<boolean> {
		const match = await this.matchRepository.findById(matchId);
		if (!match) {
			throw new Error(`Match with id ${matchId} not found`);
		}
		return match.player1Id === userId;
	}

	// プレイヤーのready状態を設定
	async setPlayerReady(
		matchId: MatchId,
		userId: UserId,
		isReady: boolean,
	): Promise<void> {
		// matchが存在するかチェック
		const match = await this.matchRepository.findById(matchId);
		if (!match) {
			throw new Error(`Match with id ${matchId} not found`);
		}

		// プレイヤーがmatchに参加しているかチェック
		if (match.player1Id !== userId && match.player2Id !== userId) {
			console.log(
				`User ${userId} attempted to set ready state for match ${matchId}, but is not a player. Match players: ${match.player1Id}, ${match.player2Id}`,
			);
			throw new Error(`User ${userId} is not a player in match ${matchId}`);
		}

		// ready状態を更新
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

		// ready状態をブロードキャスト
		this.broadcastReadyState(matchId);
	}

	// ready状態をブロードキャスト
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

		// 2名揃った場合は自動的にマッチを開始
		if (readyCount >= 2) {
			console.log(`All players ready for match ${matchId}, starting match automatically`);
			this.startMatch(matchId, this.roomId).catch(error => {
				console.error(`Failed to start match ${matchId}:`, error);
			});
		}
	}

	// マッチ終了時にready状態をクリア
	public clearReadyState(matchId: MatchId): void {
		this.readyPlayers.delete(matchId);
		console.log(`Cleared ready state for match ${matchId}`);
	}

	// ready状態を取得
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

	// 初期マッチ状態を送信（マッチページに遷移した時）
	async sendInitialMatchState(matchId: MatchId): Promise<void> {
		const match = await this.matchRepository.findById(matchId);
		if (!match) {
			throw new Error(`Match with id ${matchId} not found`);
		}

		// 初期状態をブロードキャスト
		if (wsManager.hasRoom(this.roomId)) {
			const state = this.createMatchStateDto(match);
			wsManager.broadcast(this.roomId, {
				status: "Match",
				data: {
					type: "match_state",
					matchId: matchId,
					state: state,
				},
			});
		}
	}


	private createMatchStateDto(match: Match): RealtimeMatchStateDto {
		return {
			status: match.status,
			ball: {
				x: match.ballState.x,
				y: match.ballState.y,
			},
			paddles: {
				player1: { id: match.player1Id, y: match.paddle1State.y },
				player2: { id: match.player2Id, y: match.paddle2State.y },
			},
			scores: {
				player1: match.score1,
				player2: match.score2,
			},
		};
	}
}
