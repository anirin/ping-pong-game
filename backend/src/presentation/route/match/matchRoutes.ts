import { MatchService } from "@application/services/match/MatchService.js";
import type {
	MatchIncomingMsg,
	MatchOutgoingMsg,
} from "@presentation/websocket/match/match-msg.js";
import type { WebSocketContext } from "../../websocket/ws-manager.js";

export async function MatchWSHandler(
	msg: MatchIncomingMsg,
	context: WebSocketContext,
): Promise<MatchOutgoingMsg> {
	const matchService = new MatchService();

	// braodcast は room の実装を参考にする

	try {
		switch (msg.action) {
			case "start": {
				await matchService.startMatch(msg.matchId, context.joinedRoom);
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
					context.authedUser,
					msg.data.y,
				);
				// todo : return 絶対削除
				return {
					status: "Match",
					data: {
						type: "match_started",
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
