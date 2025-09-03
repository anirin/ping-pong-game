// 発火したイベントの受信のみを行う （ event の発火は application layer でのみ行う）

import { TournamentService } from "@application/services/tournament/TournamentService.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { globalEventEmitter } from "./globalEventEmitter.js";

globalEventEmitter.on(
	"room.started",
	(roomId: RoomId, participants: UserId[], ownerid: UserId) => {
		console.log("tournament event started");

		// tournament service を呼び出す
		const tournamentService = new TournamentService();
		tournamentService.startTournament(participants, roomId, ownerid);
	},
);

globalEventEmitter.on("match.finished", (tournamentId: TournamentId) => {
	console.log("match event finished");

	// tournament service を呼び出す
	const tournamentService = new TournamentService();
	tournamentService.processAfterMatch(tournamentId);
});
