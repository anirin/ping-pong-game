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
import type {
	TournamentIncomingMsg,
	TournamentOutgoingMsg,
} from "../tournament/tournament-msg.js";
import { TournamentWSHandler } from "../tournament/tournamentRoutes.js";
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
	websocket: WebSocket.WebSocket;
	roomSockets: Map<RoomId, Set<WebSocket.WebSocket>>;
};

export async function registerWebSocket(app: FastifyInstance) {
	app.get(
		"/wss",
		{ websocket: true },
		(connection: WebSocket.WebSocket, req) => {
			const ws = connection;

			// todo auth 処理は共通なので ws 共通の middleware にまとめる
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

			// todo service と repository それぞれ責務があるとこに押し込める
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
							// front -> back match start が押されたら
								// 操作は player 1 と player 2 のみで行う
								// game 画面に render する処理 + match を開始する処理

							// front -> back match finish が押されたら
								// 処理内容

							// game の内容
								// game start
								// game finish

							// match を終了する処理
							// tournament 画面を render する処理 （通常と同じなので tournament case で処理を行う **
							// 全ての試合が終了している場合は次戦の生成を行うので毎回呼び出してももんだいない 全ての match 情報をどのみち　frontend に渡すことになる
							// tournament finish もこの段階でわかると思うのでそのロジックも追加すべき
							// game 処理はこちらに含めるように構成を変更する
							// 今回の pr　は tourmanet に絞り込むので簡易的なものにしてテストだけを行うようにする（統合はおそらく最後で良い）
						}
						case "Tournament": {
							const resultmsg = await TournamentWSHandler(
								data as TournamentIncomingMsg,
								context,
							);
							broadcast(context.joinedRoom!, resultmsg);
							break;
						}
					}
				} catch (e) {
					console.error(e);
				}
			});

			ws.on("close", () => {
				leaveAll(ws);
			});
		},
	);
}
