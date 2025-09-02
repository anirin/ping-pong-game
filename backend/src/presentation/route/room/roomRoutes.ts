import {
	RoomService,
	RoomUserService,
} from "@application/services/rooms/RoomService.js";
import type {
	RoomId,
	WSRoomData,
} from "@domain/model/value-object/room/Room.js";
import type { WSTournamentData } from "@domain/model/value-object/tournament/Tournament.js";
import type WebSocket from "@fastify/websocket";
import { AppDataSource } from "@infrastructure/data-source.js";
import { TypeOrmRoomRepository } from "@infrastructure/repository/rooms/TypeORMRoomRepository.js";
import { EventEmitter } from "events";
import type { FastifyInstance } from "fastify";
import { decodeJWT } from "../auth/authRoutes.js";
import type { WebSocketContext } from "../websocket/ws.js";
import type { WSOutgoingMsg } from "../websocket/ws-msg.js";

// todo room にも eventEmitter を追加する

export async function registerRoomRoutes(app: FastifyInstance) {
	const roomRepository = new TypeOrmRoomRepository(
		AppDataSource.getRepository("RoomEntity"),
	);
	const eventEmitter = new EventEmitter(); // api routing で eventEmitter は不要だが、ここでは使用している
	const roomService = new RoomService(eventEmitter);

	// POST /rooms: ルーム作成
	app.post<{ Body: { mode?: string } }>("/rooms", async (request, reply) => {
		const token = request.headers.authorization?.replace("Bearer ", "");
		try {
			if (!token) throw Error("no JWT included");
			const owner_id = decodeJWT(app, token);
			if (!owner_id) {
				return reply
					.status(400)
					.send({ error: "room and password are required" });
			}
			const { mode } = request.body;
			const room = await roomService.createRoom(owner_id);
			return reply.status(201).send({
				id: room.id,
				mode: room.mode,
				status: room.status,
				createdAt: room.createdAt,
			});
		} catch (error: any) {
			return reply.status(500).send({ error: error.message });
		}
	});

	// GET /rooms/:id: ルーム取得
	app.get<{ Params: { id: string } }>("/rooms/:id", async (request, reply) => {
		try {
			const { id } = request.params;
			const room = await roomService.getRoomById(id);
			if (!room) {
				return reply.status(404).send({ error: "Room not found" });
			}
			return reply.status(200).send({
				id: room.id,
				mode: room.mode,
				status: room.status,
				createdAt: room.createdAt,
			});
		} catch (error: any) {
			return reply.status(500).send({ error: error.message });
		}
	});

	// PATCH /users/:id/status: ステータス更新
	// app.patch<{ Params: { id: string }; Body: { status: string } }>(
	// 	"/rooms/:id/status",
	// 	async (request, reply) => {
	// 		try {
	// 			const { id } = request.params;
	// 			const { status } = request.body;
	// 			if (!status) {
	// 				return reply.status(400).send({ error: "Status is required" });
	// 			}
	// 			const room = await roomService.updateStatus(id, status);
	// 			if (!room) {
	// 				return reply.status(404).send({ error: "Rooms not found" });
	// 			}
	// 			return reply.status(200).send({
	// 				id: room.id,
	// 				mode: room.mode,
	// 				status: room.status,
	// 				createdAt: room.createdAt,
	// 			});
	// 		} catch (error: any) {
	// 			return reply.status(500).send({ error: error.message });
	// 		}
	// 	},
	// );
}

export async function RoomWSHandler(
	action: "START" | "DELETE",
	eventEmitter: EventEmitter,
	context: WebSocketContext,
): Promise<WSOutgoingMsg> {
	const roomService = new RoomService(eventEmitter);
	if (context.joinedRoom === null) throw Error("joined no room");
	switch (action) {
		// start は tournament を開始する 処理に変更が加わる
		case "START": {
			if (await roomService.startRoom(context.joinedRoom, context.authedUser)) {
				return {
					status: "Room",
					msg: "room started",
				} satisfies WSOutgoingMsg;
			} else {
				return {
					status: "error",
					msg: "failed to start room",
				} satisfies WSOutgoingMsg;
			}
		}
		case "DELETE": {
			if (
				await roomService.deleteRoom(context.joinedRoom, context.authedUser)
			) {
				return {
					status: "Room",
					data: {
						action: "DELETE",
						users: [],
					} satisfies WSRoomData,
				} satisfies WSOutgoingMsg;
			} else {
				return {
					status: "error",
					msg: "failed to delete room",
				} satisfies WSOutgoingMsg;
			}
		}
	}
}

export async function RoomUserWSHandler(
	action: "ADD" | "DELETE",
	room_id: RoomId | null,
	context: WebSocketContext,
): Promise<WSOutgoingMsg> {
	const roomUserService = new RoomUserService();
	const roomId = action === "ADD" ? room_id : context.joinedRoom;
	if (!roomId) throw Error("no room specified");
	const roomSockets = context.roomSockets;
	const set = roomSockets.get(roomId) ?? new Set<WebSocket.WebSocket>();
	const ws = context.websocket;
	switch (action) {
		case "ADD": {
			console.log("🔍 RoomUserWSHandler: Processing ADD action", {
				userId: context.authedUser,
				roomId: roomId,
				joinedRoom: context.joinedRoom,
			});

			if (await roomUserService.joinRoom(context.authedUser, roomId)) {
				console.log("✅ RoomUserWSHandler: Successfully joined room", {
					userId: context.authedUser,
					roomId: roomId,
				});

				context.joinedRoom = roomId;
				set.add(ws);
				roomSockets.set(roomId, set);
				return {
					status: "Room",
					data: {
						action: "USER",
						users: await roomUserService.getAllParticipants(roomId),
					} satisfies WSRoomData,
				} satisfies WSOutgoingMsg;
			} else {
				console.error("❌ RoomUserWSHandler: Failed to join room", {
					userId: context.authedUser,
					roomId: roomId,
					reason: "roomUserService.joinRoom returned false",
				});

				return {
					status: "error",
					msg: "failed to join room",
				} satisfies WSOutgoingMsg;
			}
		}
		case "DELETE": {
			if (await roomUserService.leaveRoom(context.authedUser)) {
				context.joinedRoom = null;
				set.delete(ws);
				if (set.size) roomSockets.set(roomId, set);
				else roomSockets.delete(roomId);
				return {
					status: "Room",
					data: {
						action: "USER",
						users: await roomUserService.getAllParticipants(roomId),
					} satisfies WSRoomData,
				} satisfies WSOutgoingMsg;
			} else {
				return {
					status: "error",
					msg: "failed to leave room",
				} satisfies WSOutgoingMsg;
			}
		}
	}
}
