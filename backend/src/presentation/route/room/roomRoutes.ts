import {
	RoomService,
	type RoomUserService,
} from "@application/services/rooms/RoomService.js";
import { UserService } from "@application/services/users/UserService.js";
import type { WSRoomData } from "@domain/model/value-object/room/Room.js";
import type { WSTournamentData } from "@domain/model/value-object/tournament/Tournament.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { TypeOrmRoomRepository } from "@infrastructure/repository/rooms/TypeORMRoomRepository.js";
import { TypeOrmUserRepository } from "@infrastructure/repository/users/TypeORMUserRepository.js";
import type { FastifyInstance } from "fastify";
import { decodeJWT } from "../auth/authRoutes.js";
import type { WebSocketContext } from "../websocket/ws.js";
import type { WSOutgoingMsg } from "../websocket/ws-msg.js";

export async function registerRoomRoutes(app: FastifyInstance) {
	const roomRepository = new TypeOrmRoomRepository(
		AppDataSource.getRepository("RoomEntity"),
	);
	const userRepository = new TypeOrmUserRepository(
		AppDataSource.getRepository("UserEntity"),
	);
	const roomService = new RoomService();
	const userService = new UserService(userRepository);

	// POST /rooms: ルーム作成
	app.post<{ Body: { mode?: string } }>("/rooms", async (request, reply) => {
		const token = request.headers.authorization?.replace("Bearer ", "");
		try {
			if (!token) throw Error("no JWT included");
			const owner_id = decodeJWT(app, token);
			if (!owner_id || !(await userService.getUserById(owner_id))) {
				return reply
					.status(400)
					.send({ error: "invalid JWT or non existing user" });
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
}

export async function RoomWSHandler(
	action: "START" | "DELETE",
	room_service: RoomService,
	context: WebSocketContext,
): Promise<WSOutgoingMsg> {
	if (context.joinedRoom === null) throw Error("joined no room");
	switch (action) {
		case "START": {
			if (
				await room_service.startRoom(context.joinedRoom, context.authedUser)
			) {
				return {
					status: "Tournament",
					data: {
						next_match_id: "",
						matches: [],
					} satisfies WSTournamentData,
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
				await room_service.deleteRoom(context.joinedRoom, context.authedUser)
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

export async function JoinRoomWS(
	room_user_service: RoomUserService,
	context: WebSocketContext,
): Promise<WSOutgoingMsg> {
	try {
		const succeeded = await room_user_service.joinRoom(
			context.authedUser,
			context.joinedRoom,
		);
		if (succeeded)
			return {
				status: "Room",
				data: {
					action: "USER",
					users: await room_user_service.getAllRoomUsers(context.joinedRoom),
				} satisfies WSRoomData,
			} satisfies WSOutgoingMsg;
		else
			return {
				status: "error",
				msg: "failed to join room",
			} satisfies WSOutgoingMsg;
	} catch (error) {
		if (error instanceof Error) {
			return {
				status: "error",
				msg: error.message,
			} satisfies WSOutgoingMsg;
		}
		throw Error("unexpected error");
	}
}

export async function LeaveRoomWS(
	room_user_service: RoomUserService,
	context: WebSocketContext,
): Promise<WSOutgoingMsg> {
	try {
		const succeeded = await room_user_service.leaveRoom(context.authedUser);
		if (succeeded)
			return {
				status: "Room",
				data: {
					action: "USER",
					users: await room_user_service.getAllRoomUsers(context.joinedRoom),
				} satisfies WSRoomData,
			} satisfies WSOutgoingMsg;
		else
			return {
				status: "error",
				msg: "failed to join room",
			} satisfies WSOutgoingMsg;
	} catch (error) {
		if (error instanceof Error) {
			return {
				status: "error",
				msg: error.message,
			} satisfies WSOutgoingMsg;
		}
		throw Error("unexpected error");
	}
}
