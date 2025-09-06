import { RoomService } from "@application/services/rooms/RoomService.js";
import type WebSocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import { decodeJWT } from "../route/auth/authRoutes.js";
import { MatchWSHandler } from "../route/match/matchRoutes.js";
import {
	JoinRoomWS,
	LeaveRoomWS,
	RoomWSHandler,
} from "../route/room/roomRoutes.js";
import { TournamentWSHandler } from "../route/tournament/tournamentRoutes.js";
import { type WebSocketContext, wsManager } from "./ws-manager.js";
import type { WSIncomingMsg, WSOutgoingMsg } from "./ws-msg.js";

export async function registerWSRoutes(app: FastifyInstance) {
	app.get(
		"/socket",
		{ websocket: true },
		async (connection: WebSocket.WebSocket, req) => {
			const ws = connection;
			const url = new URL(req.url, "https://localhost:8080/socket");

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

			const authedUser = decodeJWT(app, token!);
			if (!authedUser) {
				ws.close(4001, "user authorization failed");
				return;
			}
			const joinedRoom = wsManager.specifyRoom(url);
			if (!joinedRoom) {
				ws.close(4001, "room specification failed");
				return;
			}

			const context: WebSocketContext = {
				authedUser: authedUser,
				joinedRoom: joinedRoom,
			};

			const joinResultMsg = await JoinRoomWS(context);
			if (joinResultMsg.status === "error") {
				ws.send(JSON.stringify(joinResultMsg));
				ws.close();
				return;
			} else {
				wsManager.addWebSocketToRoom(
					context.joinedRoom,
					ws,
					context.authedUser,
				);

				const roomService = RoomService.getInstance(context.joinedRoom);
				const room = await roomService.getRoomById(context.joinedRoom);
				if (room && room.status === "playing") {
					wsManager.recordUserReconnect(context.joinedRoom, context.authedUser);
				}

				wsManager.broadcast(context.joinedRoom, joinResultMsg);
			}

			ws.on("message", async (raw: any) => {
				console.log("message received: ", raw.toString());
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
							console.log("Room received: ", data);
							const resultmsg = await RoomWSHandler(data.action, context);
							if (resultmsg.status === "error")
								ws.send(JSON.stringify(resultmsg));
							else wsManager.broadcast(context.joinedRoom, resultmsg);
							break;
						}
						case "Tournament": {
							console.log("Tournament received: ", data);
							const resultmsg = await TournamentWSHandler(data, context);
							wsManager.broadcast(context.joinedRoom, resultmsg);
							break;
						}
						case "Match": {
							console.log("Match received: ", data);
							const resultmsg = await MatchWSHandler(data, context);
							if (resultmsg.data.type === "error")
								ws.send(JSON.stringify(resultmsg));
							else wsManager.broadcast(context.joinedRoom, resultmsg);
							break;
						}
					}
				} catch (e) {
					console.error(e);
				}
			});

			ws.on("close", async () => {
				try {
					console.log(
						`WebSocket closed for user ${context.authedUser} in room ${context.joinedRoom}`,
					);
					const roomService = RoomService.getInstance(context.joinedRoom);
					let resultmsg: WSOutgoingMsg;

					const isOwner = await roomService.checkOwner(
						context.joinedRoom,
						context.authedUser,
					);
					if (isOwner) {
						const room = await roomService.getRoomById(context.joinedRoom);
						if (room && room.status === "waiting") {
							console.log(
								`Owner ${context.authedUser} temporarily left room ${context.joinedRoom} (room status: ${room.status})`,
							);
							resultmsg = await LeaveRoomWS(context);
							if (resultmsg.status !== "error") {
								wsManager.removeWebSocketFromRoom(
									context.joinedRoom,
									ws,
									context.authedUser,
								);
								wsManager.broadcast(context.joinedRoom, resultmsg);
							}
						} else if (room && room.status === "playing") {
							console.log(
								`Owner ${context.authedUser} left room ${context.joinedRoom} during ongoing game (room status: ${room.status})`,
							);
							resultmsg = await LeaveRoomWS(context);
							if (resultmsg.status !== "error") {
								wsManager.removeWebSocketFromRoom(
									context.joinedRoom,
									ws,
									context.authedUser,
								);
								wsManager.broadcast(context.joinedRoom, resultmsg);
							}
						} else {
							console.log(
								`Owner ${context.authedUser} left room ${context.joinedRoom}, deleting room (room status: ${room?.status || "unknown"})`,
							);
							resultmsg = await RoomWSHandler("DELETE", context);
							if (resultmsg.status !== "error") {
								wsManager.broadcast(context.joinedRoom, resultmsg);
								wsManager.leaveAllfromRoom(context.joinedRoom);
								return;
							}
						}
					} else {
						console.log(
							`Non-owner ${context.authedUser} left room ${context.joinedRoom}`,
						);
						resultmsg = await LeaveRoomWS(context);
						if (resultmsg.status !== "error") {
							wsManager.removeWebSocketFromRoom(
								context.joinedRoom,
								ws,
								context.authedUser,
							);
							wsManager.broadcast(context.joinedRoom, resultmsg);
						}
					}

					console.log(
						`Removing WebSocket for user ${context.authedUser} from room ${context.joinedRoom}`,
					);

					const room = await roomService.getRoomById(context.joinedRoom);
					console.log(
						`Room status for user ${context.authedUser}:`,
						room?.status,
					);
					if (room && room.status === "playing") {
						console.log(
							`Starting disconnect monitoring for user ${context.authedUser} in room ${context.joinedRoom} (room is playing)`,
						);
						wsManager.recordUserDisconnect(
							context.joinedRoom,
							context.authedUser,
						);
					} else {
						console.log(
							`Room status is not 'playing' (${room?.status}), skipping disconnect monitoring`,
						);
					}

					wsManager.removeWebSocketFromRoom(
						context.joinedRoom,
						ws,
						context.authedUser,
					);
				} catch (error) {
					console.error("WebSocket close error:", error);
					wsManager.removeWebSocketFromRoom(
						context.joinedRoom,
						ws,
						context.authedUser,
					);
				}
			});
		},
	);
}
