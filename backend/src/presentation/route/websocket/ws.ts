import {
	RoomService,
	RoomUserService,
} from "@application/services/rooms/RoomService.js";
import { UserService } from "@application/services/users/UserService.js";
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
import { JoinRoomWS, LeaveRoomWS, RoomWSHandler } from "../room/roomRoutes.js";
import type { WSIncomingMsg, WSOutgoingMsg } from "./ws-msg.js";

const rooms = new Map<RoomId, Set<WebSocket.WebSocket>>();

function authorizeUser(
	app: FastifyInstance,
	authHeader: string | undefined,
): UserId | null {
	if (!authHeader) return null;
	const userId = decodeJWT(app, authHeader);
	if (!userId) return null;
	return userId;
}

function specifyRoom(url: URL): RoomId | null {
	return url.searchParams.get("room");
}

function leaveAllfromRoom(roomId: RoomId): boolean {
	const set = rooms.get(roomId);
	if (!set) return false;
	set.forEach((ws) => {
		ws.close();
	});
	rooms.delete(roomId);
	return true;
}

function broadcast(roomId: RoomId, payload: WSOutgoingMsg) {
	const set = rooms.get(roomId);
	if (!set?.size) return;
	const msg = JSON.stringify(payload);
	for (const sock of set) {
		if ((sock as any).readyState === (sock as any).OPEN)
			sock.send(msg);
	}
}

export type WebSocketContext = {
	authedUser: UserId;
	joinedRoom: RoomId;
};

export async function registerWSRoutes(app: FastifyInstance) {
	app.get(
		"/socket",
		{ websocket: true },
		async (connection: WebSocket.WebSocket, req) => {
			const ws = connection;
			const url = new URL(req.url, "https://localhost:8080/socket");

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
			const userService = new UserService(userRepository);
			const roomService = new RoomService();
			const roomUserService = new RoomUserService();

			let token: string | undefined;

			const authHeader = req.headers["authorization"];
			if (authHeader?.startsWith("Bearer ")) {
				token = authHeader.substring(7);
			}
			if (!token) {
				token = url.searchParams.get("token") ?? undefined;
			}

			if (!token) {
				ws.close(4001, "user authorization failed: token not found");
				return;
			}

			const authedUser = decodeJWT(app, token);
			if (!authedUser) {
				ws.close(4001, "user authorization failed");
				return;
			}
			const joinedRoom = await specifyRoom(url);
			if (!joinedRoom) {
				ws.close(4001, "room specification failed");
				return;
			}

			const context: WebSocketContext = {
				authedUser: authedUser,
				joinedRoom: joinedRoom,
			};

			const joinResultMsg = await JoinRoomWS(
				roomUserService,
				roomService,
				context,
			);
			if (joinResultMsg.status === "error") {
				ws.send(JSON.stringify(joinResultMsg));
				ws.close();
				return;
			} else {
				let set = rooms.get(context.joinedRoom);
				if (!set) set = new Set<WebSocket.WebSocket>();
				set.add(ws);
				rooms.set(context.joinedRoom, set);
				broadcast(context.joinedRoom, joinResultMsg);
			}

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
							else broadcast(context.joinedRoom, resultmsg);
							break;
						}
						case "Match": {
						}
					}
				} catch (e) {
					console.error(e);
				}
			});

			ws.on("close", async () => {
				try {
					let resultmsg: WSOutgoingMsg;
					if (
						await roomService.checkOwner(context.joinedRoom, context.authedUser)
					) {
						resultmsg = await RoomWSHandler("DELETE", roomService, context);
						if (resultmsg.status !== "error") {
							broadcast(context.joinedRoom, resultmsg);
							leaveAllfromRoom(context.joinedRoom);
							return;
						}
					} else {
						resultmsg = await LeaveRoomWS(roomUserService, context);
						if (resultmsg.status !== "error") {
							rooms.get(context.joinedRoom)?.delete(ws);
							broadcast(context.joinedRoom, resultmsg);
							return;
						}
					}
					ws.send(JSON.stringify(resultmsg));
					return;
				} catch (error) {
					console.error(error);
				}
			});
		},
	);
}
