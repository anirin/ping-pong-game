import { MatchService } from "@application/services/match/MatchService.js";
import type {
	MatchIncomingMsg,
	MatchOutgoingMsg,
} from "@presentation/websocket/match/match-msg.js";
import type { WebSocketContext } from "../../websocket/ws-manager.js";

// 重複リクエストを防ぐためのMap
const pendingStartRequests = new Set<string>();

export async function MatchWSHandler(
	msg: MatchIncomingMsg,
	context: WebSocketContext,
): Promise<MatchOutgoingMsg> {
	// room idでシングルトンインスタンスを取得
	const matchService = MatchService.getInstance(context.joinedRoom);

	// braodcast は room の実装を参考にする

	try {
		switch (msg.action) {
			case "start": {
				// player1からのみstart matchを受け付ける
				const isPlayer1 = await matchService.isPlayer1(
					msg.matchId,
					context.authedUser,
				);
				if (!isPlayer1) {
					console.log(
						`Non-player1 user ${context.authedUser} attempted to start match ${msg.matchId}, ignoring`,
					);
					return {
						status: "Match",
						data: {
							type: "error",
							message: "Only player1 can start the match",
						},
					};
				}

				// 重複リクエストを防ぐ
				const requestKey = `${msg.matchId}-${context.joinedRoom}`;
				if (pendingStartRequests.has(requestKey)) {
					console.log(
						`Duplicate start request for match ${msg.matchId}, ignoring`,
					);
					return {
						status: "Match",
						data: {
							type: "error",
							message: "Match is already starting",
						},
					};
				}

				pendingStartRequests.add(requestKey);
				try {
					await matchService.startMatch(msg.matchId, context.joinedRoom);
					return {
						status: "Match",
						data: {
							type: "match_started",
							matchId: msg.matchId,
						},
					};
				} finally {
					// リクエスト完了後にSetから削除
					pendingStartRequests.delete(requestKey);
				}
			}
			case "move": {
				await matchService.handlePlayerInput(
					msg.matchId,
					context.authedUser,
					msg.data.y,
				);
				return {
					// 本来不要　エラー時は注意
					status: "Match",
					data: {
						type: "none",
					},
				};
			}
			case "ready": {
				await matchService.setPlayerReady(
					msg.matchId,
					context.authedUser,
					msg.data.isReady,
				);
				return {
					status: "Match",
					data: {
						type: "none",
					},
				};
			}
			case "get_initial_state": {
				await matchService.sendInitialMatchState(msg.matchId);
				return {
					status: "Match",
					data: {
						type: "none",
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
