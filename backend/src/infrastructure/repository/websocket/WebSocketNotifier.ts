// /**
//  * このファイルは、IGameNotifierインターフェースのWebSocket実装を提供します。
//  * FastifyのWebSocket接続を管理し、ゲームの状態をクライアントにリアルタイムで通知します。
//  */
// import type { GameService } from "@application/services/game/GameService.js";
// import type { IGameNotifier } from "@application/services/game/IGameNotifier.js";
// import type { RealtimeMatchStateDto } from "@application/services/game/MatchData.js";
// import type { MatchId } from "@domain/model/value-object/match/Match.js";
// import type { UserId } from "@domain/model/value-object/user/User.js";
// import { WebSocket } from "ws";

// export class WebSocketNotifier implements IGameNotifier {
// 	private matchRooms: Map<MatchId, Set<WebSocket>> = new Map();
// 	private socketToUserMap: Map<
// 		WebSocket,
// 		{ matchId: MatchId; userId: UserId }
// 	> = new Map();
// 	private gameService: GameService | null = null;
// 	public setGameService(service: GameService): void {
// 		this.gameService = service;
// 	}
// 	public addConnection(
// 		matchId: MatchId,
// 		userId: UserId,
// 		socket: WebSocket,
// 	): void {
// 		if (!this.matchRooms.has(matchId)) {
// 			this.matchRooms.set(matchId, new Set());
// 		}
// 		this.matchRooms.get(matchId)!.add(socket);
// 		// 新しいMapにも情報を登録
// 		this.socketToUserMap.set(socket, { matchId, userId });

// 		console.log(
// 			`[WebSocket] Connection added for user ${userId} to match room ${matchId}`,
// 		);

// 		socket.on("close", () => {
// 			this.removeConnection(socket);
// 		});
// 	}
// 	public removeConnection(socket: WebSocket): void {
// 		const userInfo = this.socketToUserMap.get(socket);
// 		if (!userInfo) return;

// 		const { matchId, userId } = userInfo;
// 		const room = this.matchRooms.get(matchId);

// 		if (room) {
// 			room.delete(socket);
// 			if (room.size === 0) {
// 				this.matchRooms.delete(matchId);
// 			}
// 		}

// 		this.socketToUserMap.delete(socket);
// 		console.log(
// 			`[WebSocket] Connection removed for user ${userId} from match room ${matchId}`,
// 		);

// 		if (this.gameService) {
// 			this.gameService.handleDisconnection(matchId, userId);
// 		}
// 	}

// 	public broadcastGameState(
// 		matchId: MatchId,
// 		state: RealtimeMatchStateDto,
// 	): void {
// 		const room = this.matchRooms.get(matchId);
// 		if (!room) return;

// 		const message = JSON.stringify({
// 			status: "Match",
// 			data: {
// 				action: "Move",
// 				...state,
// 			},
// 		});

// 		for (const socket of room) {
// 			if (socket.readyState === WebSocket.OPEN) {
// 				socket.send(message);
// 			}
// 		}
// 	}

// 	public notifyMatchFinish(
// 		matchId: MatchId,
// 		finalState: RealtimeMatchStateDto,
// 	): void {
// 		const room = this.matchRooms.get(matchId);
// 		if (!room) return;

// 		const message = JSON.stringify({
// 			status: "Match",
// 			data: {
// 				action: "Finish",
// 				...finalState,
// 			},
// 		});

// 		for (const socket of room) {
// 			if (socket.readyState === WebSocket.OPEN) {
// 				socket.send(message);
// 			}
// 		}
// 	}
// }
