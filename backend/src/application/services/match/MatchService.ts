import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import type { Match } from "@domain/model/entity/match/Match.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { MatchEntity } from "@infrastructure/entity/match/MatchEntity.js";
import { TypeORMMatchRepository } from "@infrastructure/repository/match/TypeORMMatchRepository.js";
import type { RealtimeMatchStateDto } from "@presentation/route/match/match-msg.js"; // todo 依存してはいけない
import type { EventEmitter } from "events";

type Info = {
	interval: NodeJS.Timeout;
	match: Match;
};

export class MatchService {
	private intervals: Map<MatchId, Info> = new Map();
	private readonly matchRepository: MatchRepository;
	private readonly eventEmitter: EventEmitter;
	private broadcastCallback?: (
		matchId: MatchId,
		state: RealtimeMatchStateDto,
	) => void;

	constructor(eventEmitter: EventEmitter) {
		this.matchRepository = new TypeORMMatchRepository(
			AppDataSource.getRepository(MatchEntity),
		);
		this.eventEmitter = eventEmitter;
	}

	setBroadcastCallback(
		callback: (matchId: MatchId, state: RealtimeMatchStateDto) => void,
	) {
		this.broadcastCallback = callback;
	}

	async startMatch(matchId: MatchId): Promise<void> {
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
			if (this.broadcastCallback) {
				const state = this.createMatchStateDto(match);
				this.broadcastCallback(matchId, state);
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
					await this.finishMatch(matchId, match.winnerId!);
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

	async finishMatch(matchId: MatchId, winnerId: UserId): Promise<void> {
		const match = await this.matchRepository.findById(matchId);
		if (!match) {
			throw new Error("Match not found");
		}

		// 試合が終了した時点で、現在のscoreを保存
		match.finish(winnerId);

		// データベースに保存
		try {
			await this.matchRepository.save(match);
			const savedMatch = await this.matchRepository.findById(matchId);
			if (savedMatch) {
				throw new Error("Failed to verify saved match");
			}
		} catch (error) {
			throw new Error("Failed to save match");
		}

		// tournament event を発火
		this.eventEmitter.emit("match.finished", { matchId, winnerId });
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
