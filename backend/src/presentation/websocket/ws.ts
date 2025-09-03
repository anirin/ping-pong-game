import {
	RoomService,
} from "@application/services/rooms/RoomService.js";
import type WebSocket from "@fastify/websocket";
import { type FastifyInstance } from "fastify";
import { decodeJWT } from "../route/auth/authRoutes.js";
import { JoinRoomWS, LeaveRoomWS, RoomWSHandler } from "../route/room/roomRoutes.js";
import { MatchWSHandler } from "../route/match/matchRoutes.js";
import type { WSIncomingMsg, WSOutgoingMsg } from "./ws-msg.js";
import {
	specifyRoom,
	leaveAllfromRoom,
	broadcast,
	addWebSocketToRoom,
	removeWebSocketFromRoom,
	type WebSocketContext,
} from "./ws-helper.js";

export async function registerWSRoutes(app: FastifyInstance) {
	app.get(
		"/socket",
		{ websocket: true },
		async (connection: WebSocket.WebSocket, req) => {
			const ws = connection;
			const url = new URL(req.url, "https://localhost:8080/socket");

			const roomService = new RoomService(); // todo : route dir の中に閉じ込める

			let token: string | undefined;

			const authHeader = req.headers["authorization"];
			token = authHeader;

			// todo : bearer を websocket で使えない気がしている
			// // debug
			// console.log("header : ", authHeader);

			// if (authHeader?.startsWith("Bearer ")) {
			// 	token = authHeader.substring(7);
			// }
			// // debug
			// console.log("token : ", token);

			// if (!token) {
			// 	token = url.searchParams.get("token") ?? undefined;
			// }
			// // debug
			// console.log("token : ", token);

			// if (!token) {
			// 	ws.close(4001, "user authorization failed: token not found");
			// 	return;
			// }

			const authedUser = decodeJWT(app, token!);
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
				context,
			);
			if (joinResultMsg.status === "error") {
				ws.send(JSON.stringify(joinResultMsg));
				ws.close();
				return;
			} else {
				addWebSocketToRoom(context.joinedRoom, ws);
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
								context,
							);
							if (resultmsg.status === "error")
								ws.send(JSON.stringify(resultmsg));
							else broadcast(context.joinedRoom, resultmsg);
							break;
						}
						case "Match": {
							const resultmsg = await MatchWSHandler(
								data,
								context,
							);
							if (resultmsg.data.type === "error")
								ws.send(JSON.stringify(resultmsg));
							else broadcast(context.joinedRoom, resultmsg);
							break;
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
						await roomService.checkOwner(context.joinedRoom, context.authedUser) // room dir に押し込める
					) {
						resultmsg = await RoomWSHandler("DELETE", context);
						if (resultmsg.status !== "error") {
							broadcast(context.joinedRoom, resultmsg);
							leaveAllfromRoom(context.joinedRoom);
							return;
						}
					} else {
						resultmsg = await LeaveRoomWS(context);
						if (resultmsg.status !== "error") {
							removeWebSocketFromRoom(context.joinedRoom, ws);
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
