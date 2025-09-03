import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type WebSocket from "@fastify/websocket";
import { type FastifyInstance } from "fastify";
import { decodeJWT } from "../route/auth/authRoutes.js";
import type { WSOutgoingMsg } from "./ws-msg.js";

// ルーム管理用のMap
const rooms = new Map<RoomId, Set<WebSocket.WebSocket>>();

export function authorizeUser(
	app: FastifyInstance,
	authHeader: string | undefined,
): UserId | null {
	if (!authHeader) return null;
	const userId = decodeJWT(app, authHeader);
	if (!userId) return null;
	return userId;
}

export function specifyRoom(url: URL): RoomId | null {
	return url.searchParams.get("room");
}

export function leaveAllfromRoom(roomId: RoomId): boolean {
	const set = rooms.get(roomId);
	if (!set) return false;
	set.forEach((ws) => {
		ws.close();
	});
	rooms.delete(roomId);
	return true;
}

export function broadcast(roomId: RoomId, payload: WSOutgoingMsg) {
	const set = rooms.get(roomId);
	if (!set?.size) return;
	const msg = JSON.stringify(payload);
	for (const sock of set) {
		if ((sock as any).readyState === (sock as any).OPEN) sock.send(msg);
	}
}

export function addWebSocketToRoom(roomId: RoomId, ws: WebSocket.WebSocket) {
	let set = rooms.get(roomId);
	if (!set) set = new Set<WebSocket.WebSocket>();
	set.add(ws);
	rooms.set(roomId, set);
}

export function removeWebSocketFromRoom(roomId: RoomId, ws: WebSocket.WebSocket) {
	const roomSet = rooms.get(roomId);
	if (roomSet) {
		roomSet.delete(ws);
	}
}

export type WebSocketContext = {
	authedUser: UserId;
	joinedRoom: RoomId;
};
