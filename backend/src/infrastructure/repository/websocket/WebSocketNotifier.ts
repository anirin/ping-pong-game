/**
 * このファイルは、IGameNotifierインターフェースのWebSocket実装を提供します。
 * FastifyのWebSocket接続を管理し、ゲームの状態をクライアントにリアルタイムで通知します。
 */

import type { IGameNotifier } from "@application/services/game/IGameNotifier.js";
import type {
	MatchFinishDto,
	RealtimeMatchStateDto,
} from "@application/services/game/MatchData.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import { WebSocket } from "ws";

export class WebSocketNotifier implements IGameNotifier {
	private matchRooms: Map<MatchId, Set<WebSocket>> = new Map();

	public addConnection(matchId: MatchId, socket: WebSocket): void {
		if (!this.matchRooms.has(matchId)) {
			this.matchRooms.set(matchId, new Set());
		}
		this.matchRooms.get(matchId)!.add(socket);
		console.log(`[WebSocket] Connection added to match room: ${matchId}`);

		socket.on("close", () => {
			this.removeConnection(matchId, socket);
		});
	}

	public removeConnection(matchId: MatchId, socket: WebSocket): void {
		const room = this.matchRooms.get(matchId);
		if (room) {
			room.delete(socket);
			console.log(`[WebSocket] Connection removed from match room: ${matchId}`);
			if (room.size === 0) {
				this.matchRooms.delete(matchId);
				console.log(
					`[WebSocket] Match room ${matchId} is now empty and has been deleted.`,
				);
			}
		}
	}

	public broadcastGameState(
		matchId: MatchId,
		state: RealtimeMatchStateDto,
	): void {
		const room = this.matchRooms.get(matchId);
		if (!room) return;

		const message = JSON.stringify({
			status: "Match",
			data: {
				action: "Move",
				...state,
			},
		});

		for (const socket of room) {
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(message);
			}
		}
	}

	public notifyMatchFinish(matchId: MatchId, result: MatchFinishDto): void {
		const room = this.matchRooms.get(matchId);
		if (!room) return;

		const message = JSON.stringify({
			status: "Match",
			data: {
				action: "Finish",
				...result,
			},
		});

		for (const socket of room) {
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(message);
			}
		}
	}
}
