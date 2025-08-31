import { TournamentService } from "@application/services/tournament/TournamentService.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type WebSocket from "@fastify/websocket";
import type { EventEmitter } from "events";

export type WebSocketContext = {
	authedUser: UserId;
	joinedRoom: RoomId | null;
	websocket: WebSocket.WebSocket;
	roomSockets: Map<RoomId, Set<WebSocket.WebSocket>>;
};

export async function TournamentWSHandler(
	context: WebSocketContext,
	eventEmitter: EventEmitter,
): Promise<void> {
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
}
