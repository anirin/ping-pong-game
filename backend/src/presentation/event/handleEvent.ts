// 発火したイベントの受信のみを行う （ event の発火は application layer でのみ行う）

import { TournamentService } from "@application/services/tournament/TournamentService.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { wsManager } from "../websocket/ws-manager.js";
import { globalEventEmitter } from "./globalEventEmitter.js";

globalEventEmitter.on(
	"room.started",
	async (roomId: RoomId, participants: UserId[], ownerid: UserId) => {
		console.log("tournament event started");

		try {
			// tournament service を呼び出す
			const tournamentService = new TournamentService();
			await tournamentService.startTournament(participants, roomId, ownerid);
		} catch (error) {
			console.error("Failed to start tournament:", error);
			// エラーが発生してもサーバーは停止しない
		}
	},
);

globalEventEmitter.on("match.finished", async (tournamentId: TournamentId) => {
	console.log("match event finished");

	try {
		// tournament service を呼び出す
		const tournamentService = new TournamentService();
		await tournamentService.processAfterMatch(tournamentId);
	} catch (error) {
		console.error("Failed to process match finish:", error);
		// エラーが発生してもサーバーは停止しない
	}
});
