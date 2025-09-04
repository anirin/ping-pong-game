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

	constructor() {
		this.matchRepository = new TypeORMMatchRepository(
			AppDataSource.getRepository(MatchEntity),
		);
	}

	async startMatch(matchId: MatchId, roomId: RoomId): Promise<void> {
		const match = await this.matchRepository.findById(matchId);
		if (!match) {
			throw new Error(`Match with id ${matchId} not found`);
		}

		// 既に実行中の場合は停止
		if (this.intervals.has(matchId)) {
			this.stopMatch(matchId);
		}

		match.start();

		try {
			await this.matchRepository.save(match);
		} catch (error) {
			throw new Error("Failed to save match");
		}

		// 60fpsでゲームループを開始
		const interval = setInterval(async () => {
			match.advanceFrame();

			// リアルタイム状態をブロードキャスト
			if (wsManager.hasRoom(roomId)) {
				const state = this.createMatchStateDto(match);
				wsManager.broadcast(roomId, {
					status: "Match",
					data: {
						type: "match_state",
						matchId: matchId,
						state: state,
					},
				});
			}

			// scoreが変更された場合、データベースに保存
			if (match.status === "playing") {
				try {
					await this.matchRepository.save(match);
				} catch (error) {
					throw new Error("Failed to save match");
				}
			}

			if (match.status === "finished") {
				clearInterval(interval);
				this.intervals.delete(matchId);
				try {
					await this.finishMatch(matchId, roomId, match.winnerId!);
				} catch (error) {
					throw new Error("Failed to finish match");
				}
				return;
			}
		}, 1000 / 60); // 60fps

		this.intervals.set(matchId, { interval, match });
	}

	async stopMatch(matchId: MatchId): Promise<void> {
		const info = this.intervals.get(matchId);
		if (info) {
			clearInterval(info.interval);
			this.intervals.delete(matchId);
		}
	}

	async finishMatch(
		matchId: MatchId,
		roomId: RoomId,
		winnerId: UserId,
	): Promise<void> {
		const match = await this.matchRepository.findById(matchId);
		if (!match) {
			throw new Error("Match not found");
		}

		// 試合が終了した時点で、現在のscoreを保存
		match.finish(winnerId);

		// データベースに保存
		let savedMatch: Match | null = null;
		try {
			await this.matchRepository.save(match);
			savedMatch = await this.matchRepository.findById(matchId);
			if (savedMatch) {
				throw new Error("Failed to verify saved match");
			}
		} catch (error) {
			throw new Error("Failed to save match");
		}

		// tournament event を発火
		const tournamentId: TournamentId = savedMatch!.tournamentId;
		globalEventEmitter.emit("match.finished", tournamentId);

		if (wsManager.hasRoom(roomId)) {
			wsManager.broadcast(roomId, {
				status: "Match",
				data: {
					type: "match_finished",
					matchId: matchId,
					winnerId: winnerId,
				},
			});
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
