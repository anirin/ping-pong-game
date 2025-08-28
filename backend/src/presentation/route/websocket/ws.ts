import {
	RoomService,
	RoomUserService,
} from "@application/services/rooms/RoomService.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type WebSocket from "@fastify/websocket";
import { AppDataSource } from "@infrastructure/data-source.js";
import { TypeORMMatchRepository } from "@infrastructure/repository/match/TypeORMMatchRepository.js";
import { TypeOrmRoomRepository } from "@infrastructure/repository/rooms/TypeORMRoomRepository.js";
import { TypeORMTournamentRepository } from "@infrastructure/repository/tournament/TypeORMTournamentRepository.js";
import { TypeOrmUserRepository } from "@infrastructure/repository/users/TypeORMUserRepository.js";
import { type FastifyInstance, fastify } from "fastify";
import { decodeJWT } from "../auth/authRoutes.js";
import { RoomUserWSHandler, RoomWSHandler } from "../room/roomRoutes.js";
import type { WSIncomingMsg, WSOutgoingMsg } from "./ws-msg.js";

const rooms = new Map<RoomId, Set<WebSocket.WebSocket>>();

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
};

export async function registerWebSocket(app: FastifyInstance) {
	app.get(
		"/wss",
		{ websocket: true },
		(connection: WebSocket.WebSocket, req) => {
			const ws = connection;
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

			const roomRepository = new TypeOrmRoomRepository(
				AppDataSource.getRepository("RoomEntity"),
			);
			const userRepository = new TypeOrmUserRepository(
				AppDataSource.getRepository("UserEntity"),
			);
			const tournamentRepository = new TypeORMTournamentRepository(
				AppDataSource.getRepository("TournamentEntity"),
			);
			const matchRepository = new TypeORMMatchRepository(
				AppDataSource.getRepository("MatchEntity"),
			);
			const roomService = new RoomService(roomRepository);
			const roomUserService = new RoomUserService(
				userRepository,
				roomRepository,
			);

			const context: WebSocketContext = {
				authedUser: userId,
				joinedRoom: null,
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
								roomService,
								context,
							);
							if (resultmsg.status === "error")
								ws.send(JSON.stringify(resultmsg));
							else broadcast(context.joinedRoom!, resultmsg);
							break;
						}
						case "User": {
							const resultmsg = await RoomUserWSHandler(
								data.action,
								roomUserService,
								data.room,
								context,
							);
							if (resultmsg.status === "error")
								ws.send(JSON.stringify(resultmsg));
							else broadcast(context.joinedRoom!, resultmsg);
							break;
						}
						case "Match": {
						}
					}
				} catch {}
			});

			ws.on("close", () => {
				leaveAll(ws);
			});
		},
	);
}
