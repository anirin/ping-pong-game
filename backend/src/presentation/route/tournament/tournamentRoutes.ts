import { TournamentService } from "@application/services/tournament/TournamentService.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type WebSocket from "@fastify/websocket";
import type { EventEmitter } from "events";
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
	eventEmitter: EventEmitter,
): Promise<TournamentOutgoingMsg> {
	const tournamentService = new TournamentService(eventEmitter);

	// WebSocketブロードキャストコールバックを設定 これはどういう意味だ
	tournamentService.setBroadcastCallback((tournamentId, data) => {
		if (context.joinedRoom) {
			// ルーム内の全クライアントにブロードキャスト
			const set = context.roomSockets.get(context.joinedRoom);
			if (set) {
				const message = JSON.stringify({
					status: "Tournament",
					data,
				});
				for (const ws of set) {
					if ((ws as any).readyState === (ws as any).OPEN) {
						ws.send(message);
					}
				}
			}
		}
	});

	// トーナメント開始以外にuserがトーナメントに対して操作を行うことはない
	try {
		switch (msg.action) {
			case "start_tournament": {
				if (!context.joinedRoom) {
					throw new Error("Not subscribed to a room");
				}
				const { tournament, nextMatch } =
					await tournamentService.startTournament(
						msg.participants,
						msg.room_id,
						msg.created_by,
					);
				return {
					status: "Tournament",
					data: {
						type: "tournament_started",
						tournament_id: tournament.id,
						room_id: tournament.room_id,
						participants: tournament.participants,
						next_match_id: nextMatch?.id || null,
					},
				};
			}
			default: {
				return {
					status: "Tournament",
					data: {
						type: "error",
						message: "Unknown action",
					},
				};
			}
		}
	} catch (error) {
		console.error("TournamentWSHandler error:", error);
		return {
			status: "Tournament",
			data: {
				type: "error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
		};
	}
}
