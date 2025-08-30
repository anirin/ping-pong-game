import { TournamentService } from "@application/services/tournament/TournamentService.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type WebSocket from "@fastify/websocket";
import type { WSOutgoingMsg } from "../websocket/ws-msg.js";
import type {
	TournamentIncomingMsg,
	TournamentOutgoingMsg,
} from "./tournament-msg.js";

export type WebSocketContext = {
	authedUser: UserId;
	joinedRoom: RoomId | null;
	websocket: WebSocket.WebSocket;
	roomSockets: Map<RoomId, Set<WebSocket.WebSocket>>;
};

export async function TournamentWSHandler(
	msg: TournamentIncomingMsg,
	context: WebSocketContext,
): Promise<TournamentOutgoingMsg> {
	const tournamentService = new TournamentService();
	switch (msg.action) {
		case "start_tournament": {
			if (!context.joinedRoom) throw new Error("not subscribed");
			const { tournament, nextMatch } = await tournamentService.startTournament(
				msg.participants,
				msg.room_id,
				msg.created_by,
			);
			return {
				status: "Tournament",
				data: {
					type: "tournament_status",
					tournament: tournament,
					next_match: nextMatch,
				},
			} satisfies TournamentOutgoingMsg;
		}
	}
}
