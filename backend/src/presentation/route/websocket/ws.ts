// todo websocket の routing に等しいので一個上の階層にまとめる
import {
	RoomService,
	RoomUserService,
} from "@application/services/rooms/RoomService.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type WebSocket from "@fastify/websocket";
import { AppDataSource } from "@infrastructure/data-source.js";
import { TypeOrmRoomRepository } from "@infrastructure/repository/rooms/TypeORMRoomRepository.js";
import { TypeOrmUserRepository } from "@infrastructure/repository/users/TypeORMUserRepository.js";
import { EventEmitter } from "events";
import type { FastifyInstance } from "fastify";
import { decodeJWT } from "../auth/authRoutes.js";
import { MatchWSHandler } from "../match/matchRoutes.js";
import { RoomUserWSHandler, RoomWSHandler } from "../room/roomRoutes.js";
import type { WSIncomingMsg, WSOutgoingMsg } from "./ws-msg.js";

const rooms = new Map<RoomId, Set<WebSocket.WebSocket>>();
const roomEventEmitters = new Map<RoomId, EventEmitter>();

// todo eventEmitter 処理 配置場所と関数名は要検討
function getRoomEventEmitter(roomId: RoomId | null): EventEmitter {
	if (!roomId) {
		// todo この処理は起きてはいけないが error handling が難しいので tmp でおいている
		return new EventEmitter();
	}
	if (!roomEventEmitters.has(roomId)) {
		roomEventEmitters.set(roomId, new EventEmitter());
	}
	return roomEventEmitters.get(roomId)!;
}

function cleanupRoomEventEmitter(roomId: RoomId) {
	const emitter = roomEventEmitters.get(roomId);
	if (emitter) {
		emitter.removeAllListeners();
		roomEventEmitters.delete(roomId);
	}
}

function leaveAll(ws: WebSocket.WebSocket) {
	for (const set of rooms.values()) set.delete(ws);
}

function broadcast(roomId: RoomId, payload: WSOutgoingMsg) {
	const set = rooms.get(roomId);
	if (!set?.size) return;
	const msg = JSON.stringify(payload);
	for (const sock of set) {
		if ((sock as any).readyState === (sock as any).OPEN) sock.send(msg);
	}
}

export type WebSocketContext = {
	authedUser: UserId;
	joinedRoom: RoomId | null;
	websocket: WebSocket.WebSocket;
	roomSockets: Map<RoomId, Set<WebSocket.WebSocket>>;
};

export async function registerWebSocket(app: FastifyInstance) {
	app.get(
		"/wss",
		{ websocket: true },
		(connection: WebSocket.WebSocket, req) => {
			const ws = connection;

			// todo auth 処理は共通なので ws 共通の middleware にまとめる? 要検討
			const authHeader = req.headers["authorization"];
			if (!authHeader) {
				console.log("[WebSocket] Connection attempt without token.");
				ws.close(4001, "Token is required");
				return;
			}

			const userId = decodeJWT(app, authHeader);
			if (!userId) {
				ws.close(4001, "Token is required");
				return;
			}

			const context: WebSocketContext = {
				authedUser: userId,
				joinedRoom: null,
				websocket: ws,
				roomSockets: rooms,
			};

			ws.on("message", async (raw: any) => {
				let data: WSIncomingMsg;
				try {
					data = JSON.parse(raw.toString());
				} catch {
					ws.send(
						JSON.stringify({
							status: "error",
							msg: "invalid json",
						} satisfies WSOutgoingMsg),
					);
					return;
				}
				try {
					switch (data.status) {
						case "Room": {
							const resultmsg = await RoomWSHandler(
								data.action,
								getRoomEventEmitter(context.joinedRoom),
								context,
							);
							if (resultmsg.status === "error")
								ws.send(JSON.stringify(resultmsg));
							else if (context.joinedRoom)
								broadcast(context.joinedRoom, resultmsg);
							break;
						}
						case "User": {
							const resultmsg = await RoomUserWSHandler(
								data.action,
								data.room,
								context,
							);
							if (resultmsg.status === "error")
								ws.send(JSON.stringify(resultmsg));
							else if (context.joinedRoom)
								broadcast(context.joinedRoom, resultmsg);
							break;
						}
						case "Match": {
							const resultmsg = await MatchWSHandler(
								data,
								context,
								getRoomEventEmitter(context.joinedRoom),
							);
							if (
								resultmsg.status === "Match" &&
								resultmsg.data.type === "error"
							) {
								ws.send(JSON.stringify(resultmsg));
							} else if (resultmsg.status === "Match" && context.joinedRoom) {
								broadcast(context.joinedRoom, resultmsg);
							}
							break;
						}
						// case "Tournament"
						// incoming はない （コメントを残しておく）
					}
				} catch (e) {
					console.error(e);
					ws.send(
						JSON.stringify({
							status: "error",
							msg: "Internal server error",
						} satisfies WSOutgoingMsg),
					);
				}
			});

			ws.on("close", () => {
				leaveAll(ws);
				if (context.joinedRoom) {
					const set = rooms.get(context.joinedRoom);
					if (set && set.size === 0) {
						cleanupRoomEventEmitter(context.joinedRoom);
					}
				}
			});
		},
	);
}
