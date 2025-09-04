import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type WebSocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import { decodeJWT } from "../route/auth/authRoutes.js";
import type { WSOutgoingMsg } from "./ws-msg.js";

export class WebSocketManager {
	private static instance: WebSocketManager;
	private rooms = new Map<RoomId, Set<WebSocket.WebSocket>>();

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
		console.log("broadcast to room: ", roomId);
		console.log("payload: ", payload);
		const set = this.rooms.get(roomId);
		if (!set?.size) return;
		const msg = JSON.stringify(payload);
		for (const sock of set) {
			if ((sock as any).readyState === (sock as any).OPEN) sock.send(msg);
		}
	}

	addWebSocketToRoom(roomId: RoomId, ws: WebSocket.WebSocket) {
		let set = this.rooms.get(roomId);
		if (!set) set = new Set<WebSocket.WebSocket>();
		set.add(ws);
		this.rooms.set(roomId, set);
	}

	removeWebSocketFromRoom(
		roomId: RoomId,
		ws: WebSocket.WebSocket,
	) {
		const roomSet = this.rooms.get(roomId);
		if (roomSet) {
			roomSet.delete(ws);
		}
	}

	hasRoom(roomId: RoomId): boolean {
		const set = this.rooms.get(roomId);
		return set !== undefined && set.size > 0;
	}
}

export const wsManager = WebSocketManager.getInstance();

export type WebSocketContext = {
	authedUser: UserId;
	joinedRoom: RoomId;
};
