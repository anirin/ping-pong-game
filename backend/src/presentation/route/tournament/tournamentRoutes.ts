import { TournamentService } from "@application/services/tournament/TournamentService.js";
import type {
	TournamentIncomingMsg,
	TournamentOutgoingMsg,
} from "@presentation/websocket/tournament/tournament-msg.js";
import type { WebSocketContext } from "../../websocket/ws-manager.js";

export async function TournamentWSHandler(
	msg: TournamentIncomingMsg,
	context: WebSocketContext,
): Promise<TournamentOutgoingMsg> {
	// room idでシングルトンインスタンスを取得
	const tournamentService = TournamentService.getInstance(context.joinedRoom);

	try {
		switch (msg.action) {
			case "get_status": {
				const tournamentStatus = await tournamentService.getTournamentStatus(
					context.joinedRoom,
				);

				// デバッグ用ログを追加
				// console.log(
				// 	"Tournament status response:",
				// 	JSON.stringify(tournamentStatus, null, 2),
				// );
				// console.log("Matches data:", tournamentStatus.matches);
				// if (tournamentStatus.matches.length > 0) {
				// 	console.log(
				// 		"First match structure:",
				// 		JSON.stringify(tournamentStatus.matches[0], null, 2),
				// 	);
				// }

				return {
					status: "Tournament",
					data: {
						status: tournamentStatus.status,
						next_match_id: tournamentStatus.next_match_id,
						matches: tournamentStatus.matches,
						current_round: tournamentStatus.current_round,
						winner_id: tournamentStatus.winner_id,
					},
				} as TournamentOutgoingMsg;
			}
			case "navigate_to_match": {
				console.log("TournamentAPI: マッチに遷移", msg.matchId);
				return {
					status: "Tournament",
					data: {
						type: "navigate_to_match",
						matchId: msg.matchId,
					},
				};
			}
			default: {
				throw new Error("Unknown action");
			}
		}
	} catch (error) {
		console.error("TournamentWSHandler error:", error);
		throw error;
	}
}
