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
import type { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";

export class TournamentService {
	private readonly tournamentRepository: TournamentRepository;
	private readonly matchRepository: MatchRepository;
	private readonly eventEmitter: EventEmitter;
	private broadcastCallback?: (tournamentId: TournamentId, data: any) => void; // これが謎すぎる

	constructor(eventEmitter: EventEmitter) {
		this.tournamentRepository = new TypeORMTournamentRepository(
			AppDataSource.getRepository(TournamentEntity),
		);
		this.matchRepository = new TypeORMMatchRepository(
			AppDataSource.getRepository(MatchEntity),
		);
		this.eventEmitter = eventEmitter;

		// match.finishedイベントをリスン
		this.eventEmitter.on("match.finished", this.handleMatchFinished.bind(this));

		// room.startedイベントをリスン
		this.eventEmitter.on("room.started", this.handleRoomStarted.bind(this));
	}

	setBroadcastCallback(
		callback: (tournamentId: TournamentId, data: any) => void,
	) {
		this.broadcastCallback = callback;
	}

	// EventEmitterにアクセスするためのパブリックメソッド
	getEventEmitter(): EventEmitter {
		return this.eventEmitter;
	}

	private async handleMatchFinished(data: {
		matchId: string;
		winnerId: string;
	}) {
		// マッチが終了したら、そのマッチが属するトーナメントを特定
		const match = await this.matchRepository.findById(data.matchId);
		if (!match || !match.tournamentId) return;

		// トーナメントの状態を更新
		await this.sendTournamentState(match.tournamentId);
	}

	private async handleRoomStarted(data: {
		roomId: RoomId;
		participants: UserId[];
		createdBy: UserId;
	}) {
		console.log("🎯 TournamentService: room.started event received", {
			roomId: data.roomId,
			participants: data.participants,
			createdBy: data.createdBy,
			eventEmitterId: this.eventEmitter.listenerCount("room.started")
		});
		
		// 参加者数が4人未満の場合はトーナメントを開始しない
		if (data.participants.length < 4) {
			console.log("⚠️ TournamentService: Skipping tournament start - insufficient participants", {
				required: 4,
				actual: data.participants.length
			});
			return;
		}
		
		try {
			await this.startTournament(data.participants, data.roomId, data.createdBy);
			console.log("✅ TournamentService: Tournament started successfully");
		} catch (error) {
			console.error("❌ TournamentService: Error handling room started event:", error);
		}
	}

	async startTournament(
		participants: UserId[],
		room_id: RoomId,
		createdBy: UserId,
	) {
		console.log("startTournament called");
		try {
			const tournamentId = uuidv4();
			console.log(" TournamentService: Generated tournament ID:", tournamentId);
			
			const tournament = new Tournament(
				tournamentId,
				participants,
				createdBy,
				room_id,
			);
			console.log(" TournamentService: Tournament entity created");

			// 一回戦の作成
			console.log(" TournamentService: Generating first round...");
			tournament.generateFirstRound();
			console.log("✅ TournamentService: First round generated successfully");

			// matches の db保存
			const matches = tournament.matches;
			console.log(" TournamentService: Saving matches to database...", {
				matchCount: matches.length,
				matchIds: matches.map(m => m.id)
			});
			await this.matchRepository.saveAll(matches);
			console.log("✅ TournamentService: Matches saved successfully");

			// tournament の db保存
			console.log(" TournamentService: Saving tournament to database...");
			await this.tournamentRepository.save(tournament);
			console.log("✅ TournamentService: Tournament saved successfully");

			// トーナメント開始
			console.log(" TournamentService: Starting tournament...");
			tournament.start();
			console.log("✅ TournamentService: Tournament status changed to 'ongoing'");

			// まず最初の試合も送る
			console.log(" TournamentService: Getting next match...");
			const nextMatch = tournament.getNextMatch();
			if (!nextMatch) {
				throw new Error("Next match not found");
			}
			console.log("✅ TournamentService: Next match found:", nextMatch.id);

			// WebSocketでブロードキャスト ここの実装と関心ごとをどこに置くのかが非常に難しい
			console.log(" TournamentService: Broadcasting tournament started...");
			if (this.broadcastCallback) {
				this.broadcastCallback(tournamentId, {
					type: "tournament_started",
					tournament_id: tournamentId,
					room_id, // context にあるからいらないはず
					participants,
					matches,
					next_match_id: nextMatch.id,
				});
				console.log("✅ TournamentService: Tournament started broadcast sent");
			} else {
				console.warn("⚠️ TournamentService: No broadcast callback set");
			}
		} catch (error) {
			console.error("❌ TournamentService: Error in startTournament:", {
				error: error instanceof Error ? error.message : error,
				stack: error instanceof Error ? error.stack : undefined,
				participants,
				room_id,
				createdBy
			});
			throw error; // エラーを再スローして上位でハンドリングできるようにする
		}
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

		return;
	}

	// broadcast 用
	async sendTournamentState(tournamentId: TournamentId) {
		try {
			await this.generateNextRound(tournamentId);
		} catch (error) {
			console.error("Failed to generate next round:", error);
			// エラーが発生しても現在の状態を送信
		}

		const tournament = await this.tournamentRepository.findById(tournamentId);
		if (!tournament) {
			throw new Error("Tournament not found");
		}

		const matches = await this.matchRepository.findByTournamentId(tournamentId);
		if (!matches) {
			throw new Error("Matches not found");
		}

		// tournament が終了したかを判定する logic を domain service に追加する
		if (tournament.status === "finished") {
			// websocket にて broadcast を行う
			if (this.broadcastCallback) {
				this.broadcastCallback(tournamentId, {
					type: "tournament_finished",
					tournament_id: tournamentId,
					winner_id: tournament.winner_id,
				});
			}
			return;
		}

		// 現在の状態をブロードキャスト
		if (this.broadcastCallback) {
			this.broadcastCallback(tournamentId, {
				type: "tournament_status",
				tournament_id: tournamentId,
				room_id: tournament.room_id,
				matches,
				next_match_id: tournament.getNextMatch()?.id,
				current_round: tournament.currentRound,
			});
		}

		return;
	}

	async finishTournament(tournamentId: TournamentId, winnerId: UserId) {
		const tournament = await this.tournamentRepository.findById(tournamentId);
		if (!tournament) {
			throw new Error("Tournament not found");
		}
		tournament.finish(winnerId);
		await this.tournamentRepository.save(tournament);

		// WebSocketでブロードキャスト
		if (this.broadcastCallback) {
			this.broadcastCallback(tournamentId, {
				type: "tournament_finished",
				tournament_id: tournamentId,
				winner_id: winnerId,
			});
		}
	}
}
