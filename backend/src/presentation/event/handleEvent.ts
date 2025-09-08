// 発火したイベントの受信のみを行う （ event の発火は application layer でのみ行う）

import { TournamentService } from "@application/services/tournament/TournamentService.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { globalEventEmitter } from "./globalEventEmitter.js";

globalEventEmitter.on(
	"room.started",
	async (roomId: RoomId, participants: UserId[], ownerid: UserId) => {
		console.log("tournament event started");

		try {
			// room idでシングルトンインスタンスを取得
			const tournamentService = TournamentService.getInstance(roomId);
			await tournamentService.startTournament(participants, roomId, ownerid);
		} catch (error) {
			console.error("Failed to start tournament:", error);
			// エラーが発生してもサーバーは停止しない
		}
	},
);

globalEventEmitter.on(
	"match.finished",
	async (tournamentId: TournamentId, matchId: MatchId, winnerId: UserId) => {
		console.log("Tournament event received : match event finished");

		try {
			// tournamentIdからroomIdを取得するために、まずtournamentを取得
			const { AppDataSource } = await import("@infrastructure/data-source.js");
			const { TournamentEntity } = await import(
				"@infrastructure/entity/tournament/TournamentEntity.js"
			);

			const tournamentEntity = await AppDataSource.getRepository(
				TournamentEntity,
			).findOne({
				where: { id: tournamentId },
			});

			if (!tournamentEntity) {
				console.error(`Tournament not found for id: ${tournamentId}`);
				return;
			}

			const roomId = tournamentEntity.room_id;

			// room idでシングルトンインスタンスを取得
			const tournamentService = TournamentService.getInstance(roomId);
			await tournamentService.processAfterMatch(
				tournamentId,
				matchId,
				winnerId,
			);
		} catch (error) {
			console.error("Failed to process match finish:", error);
			// エラーが発生してもサーバーは停止しない
		}
	},
);
