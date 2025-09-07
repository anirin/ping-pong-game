import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type WebSocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import { decodeJWT } from "../route/auth/authRoutes.js";
import type { WSOutgoingMsg } from "./ws-msg.js";

export class WebSocketManager {
	private static instance: WebSocketManager;
	private rooms = new Map<RoomId, Set<WebSocket.WebSocket>>();
	private userConnections = new Map<UserId, WebSocket.WebSocket>();
	// 切断監視用のマップ: roomId -> { disconnectedUsers: Set<UserId>, disconnectTimers: Map<UserId, NodeJS.Timeout> }
	private disconnectMonitors = new Map<
		RoomId,
		{
			disconnectedUsers: Set<UserId>;
			disconnectTimers: Map<UserId, NodeJS.Timeout>;
		}
	>();

	private constructor() {}

	static getInstance(): WebSocketManager {
		if (!WebSocketManager.instance) {
			WebSocketManager.instance = new WebSocketManager();
		}
		return WebSocketManager.instance;
	}

	authorizeUser(
		app: FastifyInstance,
		authHeader: string | undefined,
	): UserId | null {
		if (!authHeader) return null;
		const userId = decodeJWT(app, authHeader);
		if (!userId) return null;
		return userId;
	}

	specifyRoom(url: URL): RoomId | null {
		return url.searchParams.get("room");
	}

	leaveAllfromRoom(roomId: RoomId): boolean {
		const set = this.rooms.get(roomId);
		if (!set) return false;
		set.forEach((ws) => {
			ws.close();
		});
		this.rooms.delete(roomId);
		return true;
	}

	broadcast(roomId: RoomId, payload: WSOutgoingMsg) {
		// console.log("broadcast to room: ", roomId);
		console.log("payload: ", payload);
		const set = this.rooms.get(roomId);
		if (!set?.size) return;
		const msg = JSON.stringify(payload);
		for (const sock of set) {
			if ((sock as any).readyState === (sock as any).OPEN) sock.send(msg);
		}
	}

	addWebSocketToRoom(roomId: RoomId, ws: WebSocket.WebSocket, userId: UserId) {
		// 同じユーザーの既存接続がある場合は切断
		const existingConnection = this.userConnections.get(userId);
		if (existingConnection && existingConnection !== ws) {
			console.log(`Closing existing WebSocket connection for user ${userId}`);
			existingConnection.close(1000, "Replaced by new connection");
			this.removeWebSocketFromRoom(roomId, existingConnection);
		}

		// 新しい接続を追加
		this.userConnections.set(userId, ws);

		let set = this.rooms.get(roomId);
		if (!set) set = new Set<WebSocket.WebSocket>();
		set.add(ws);
		this.rooms.set(roomId, set);
	}

	removeWebSocketFromRoom(
		roomId: RoomId,
		ws: WebSocket.WebSocket,
		userId?: UserId,
	) {
		const roomSet = this.rooms.get(roomId);
		if (roomSet) {
			roomSet.delete(ws);
		}

		// ユーザー接続マップからも削除
		if (userId) {
			const userConnection = this.userConnections.get(userId);
			if (userConnection === ws) {
				this.userConnections.delete(userId);
			}
		} else {
			// userIdが指定されていない場合は、該当するWebSocketを検索して削除
			for (const [uid, connection] of this.userConnections.entries()) {
				if (connection === ws) {
					this.userConnections.delete(uid);
					break;
				}
			}
		}
	}

	hasRoom(roomId: RoomId): boolean {
		const set = this.rooms.get(roomId);
		return set !== undefined && set.size > 0;
	}

	// 切断監視を開始（room開始時に呼び出し）
	startDisconnectMonitoring(roomId: RoomId): void {
		console.log(`Starting disconnect monitoring for room ${roomId}`);
		if (!this.disconnectMonitors.has(roomId)) {
			this.disconnectMonitors.set(roomId, {
				disconnectedUsers: new Set<UserId>(),
				disconnectTimers: new Map<UserId, NodeJS.Timeout>(),
			});
			console.log(`Created new monitor for room ${roomId}`);
		} else {
			console.log(`Monitor already exists for room ${roomId}`);
		}
	}

	// 切断監視を停止（room終了時に呼び出し）
	stopDisconnectMonitoring(roomId: RoomId): void {
		const monitor = this.disconnectMonitors.get(roomId);
		if (monitor) {
			// 全てのタイマーをクリア
			monitor.disconnectTimers.forEach((timer) => {
				clearTimeout(timer);
			});
			this.disconnectMonitors.delete(roomId);
		}
	}

	// ユーザーの切断を記録し、3秒後に全ユーザーをlobbyに戻すタイマーを開始
	recordUserDisconnect(roomId: RoomId, userId: UserId): void {
		console.log(
			`recordUserDisconnect called for user ${userId} in room ${roomId}`,
		);
		const monitor = this.disconnectMonitors.get(roomId);
		if (!monitor) {
			console.log(
				`No monitor found for room ${roomId}, available monitors:`,
				Array.from(this.disconnectMonitors.keys()),
			);
			return;
		}

		// 既に切断済みの場合は何もしない
		if (monitor.disconnectedUsers.has(userId)) {
			console.log(`User ${userId} already in disconnected users list`);
			return;
		}

		monitor.disconnectedUsers.add(userId);

		// 3秒後に全ユーザーをlobbyに戻すタイマーを設定
		const timer = setTimeout(() => {
			console.log(`Timer fired for user ${userId} in room ${roomId}`);
			this.handleDisconnectTimeout(roomId, userId);
		}, 3000);

		monitor.disconnectTimers.set(userId, timer);
		console.log(
			`User ${userId} disconnected from room ${roomId}, monitoring for 3 seconds`,
		);
	}

	// ユーザーの再接続を記録し、タイマーをクリア
	recordUserReconnect(roomId: RoomId, userId: UserId): void {
		const monitor = this.disconnectMonitors.get(roomId);
		if (!monitor) return;

		// 切断記録とタイマーをクリア
		if (monitor.disconnectedUsers.has(userId)) {
			monitor.disconnectedUsers.delete(userId);
			const timer = monitor.disconnectTimers.get(userId);
			if (timer) {
				clearTimeout(timer);
				monitor.disconnectTimers.delete(userId);
			}
			console.log(
				`User ${userId} reconnected to room ${roomId}, monitoring cancelled`,
			);
		}
	}

	// 3秒経過後の処理：全ユーザーをlobbyに戻す
	private handleDisconnectTimeout(
		roomId: RoomId,
		disconnectedUserId: UserId,
	): void {
		console.log(
			`handleDisconnectTimeout called for user ${disconnectedUserId} in room ${roomId}`,
		);
		const monitor = this.disconnectMonitors.get(roomId);
		if (!monitor) {
			console.log(
				`No monitor found in handleDisconnectTimeout for room ${roomId}`,
			);
			return;
		}

		// まだ切断状態のままかチェック
		if (!monitor.disconnectedUsers.has(disconnectedUserId)) {
			console.log(
				`User ${disconnectedUserId} no longer in disconnected users list, skipping timeout handling`,
			);
			return;
		}

		console.log(
			`User ${disconnectedUserId} has been disconnected for 3+ seconds, returning all users to lobby`,
		);

		// 全ユーザーをlobbyに戻すメッセージを送信
		const lobbyMessage: WSOutgoingMsg = {
			status: "Room",
			data: {
				action: "FORCE_LOBBY",
				users: [],
				reason: "user_disconnected",
				message:
					"A user has been disconnected for too long. Returning to lobby.",
			} as any, // 型定義の更新が必要だが、一時的にanyで回避
		};

		console.log(
			"Broadcasting FORCE_LOBBY message:",
			JSON.stringify(lobbyMessage, null, 2),
		);
		this.broadcast(roomId, lobbyMessage);

		// 全てのWebSocket接続を切断
		this.leaveAllfromRoom(roomId);

		// 監視を停止
		this.stopDisconnectMonitoring(roomId);
	}
}

export const wsManager = WebSocketManager.getInstance();

export type WebSocketContext = {
	authedUser: UserId;
	joinedRoom: RoomId;
};
