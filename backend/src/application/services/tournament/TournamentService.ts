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

// コメント : 全体を通じて service 層は entity と db 操作双方を行って管理しているので注意が必要

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

		// eventEmitter 設定
		this.eventEmitter = eventEmitter;
		this.eventEmitter.on("match.finished", this.handleMatchFinished.bind(this));
		this.eventEmitter.on("room.started", this.handleRoomStarted.bind(this));
	}

	setBroadcastCallback(
		callback: (tournamentId: TournamentId, data: any) => void,
	) {
		this.broadcastCallback = callback;
	}

	private async handleMatchFinished(data: {
		matchId: string;
		winnerId: string; // これ不要
	}) {
		try {
			const match = await this.matchRepository.findById(data.matchId);
			if (!match) {
				throw new Error("Match not found");
			}
			await this.processAfterMatch(match.tournamentId);
		} catch (error) {
			throw new Error("Failed to process after match");
		}
	}

	private async handleRoomStarted(data: {
		roomId: RoomId;
		participants: UserId[];
		createdBy: UserId;
	}) {
		// 参加者数が4人未満の場合はトーナメントを開始しない // ここは修正
		if (data.participants.length < 4) {
			throw new Error("Insufficient participants");
		}

		await this.startTournament(data.participants, data.roomId, data.createdBy);

		return;
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

		this.broadcastTournament(tournamentId, {
			type: "tournament_started",
			tournament_id: tournamentId,
			room_id,
			participants,
			matches,
			next_match_id: nextMatch.id,
		});
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
			this.broadcastTournament(tournamentId, {
				type: "tournament_status",
				next_match_id: scheduledMatch.id,
				current_round: tournament.currentRound,
				tournament_id: tournamentId,
				matches: tournament!.matches,
			});
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

			// tournament を broadcast
			this.broadcastTournament(tournamentId, {
				type: "tournament_status",
				next_match_id: nextMatch.id,
				current_round: tournament.currentRound,
				tournament_id: tournamentId,
				matches: tournament!.matches,
			});
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
		this.broadcastTournament(tournamentId, {
			type: "tournament_finished",
			tournament_id: tournamentId,
			winner_id: winnerId,
		});
	}

	// 型定義しないとな
	private broadcastTournament(tournamentId: TournamentId, data: any) {
		if (this.broadcastCallback) {
			this.broadcastCallback(tournamentId, data);
		}
	}
}
