import { MatchService } from "@application/services/match/MatchService.js";
import type {
	MatchIncomingMsg,
	MatchOutgoingMsg,
} from "@presentation/route/match/match-msg.js";
import type { EventEmitter } from "events";
import type { WebSocketContext } from "../websocket/ws.js";

export async function MatchWSHandler(
	msg: MatchIncomingMsg,
	context: WebSocketContext,
	eventEmitter: EventEmitter,
): Promise<MatchOutgoingMsg> {
	const matchService = new MatchService(eventEmitter);

	// WebSocketブロードキャストコールバックを設定
	matchService.setBroadcastCallback((matchId, state) => {
		if (context.joinedRoom) {
			// ルーム内の全クライアントにブロードキャスト
			const set = context.roomSockets.get(context.joinedRoom);
			if (set) {
				const message = JSON.stringify({
					status: "Match",
					data: {
						type: "match_state",
						matchId,
						state,
					},
				});
				for (const ws of set) {
					if ((ws as any).readyState === (ws as any).OPEN) {
						ws.send(message);
					}
				}
			}
		}
	});

	try {
		switch (msg.action) {
			case "start": {
				await matchService.startMatch(msg.matchId);
				return {
					status: "Match",
					data: {
						type: "match_started",
						matchId: msg.matchId,
					},
				};
			}
			case "move": {
				await matchService.handlePlayerInput(
					msg.matchId,
					msg.userId,
					msg.data.y,
				);
				return {
					status: "Match",
					data: {
						type: "move_processed",
						matchId: msg.matchId,
					},
				};
			}
			default: {
				return {
					status: "Match",
					data: {
						type: "error",
						message: "Unknown action",
					},
				};
			}
		}
	} catch (error) {
		console.error("MatchWSHandler error:", error);
		return {
			status: "Match",
			data: {
				type: "error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
		};
	}
}
