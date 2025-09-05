import {
	RoomService,
	RoomUserService, // RoomUserServiceもインポートされていることを確認
} from "@application/services/rooms/RoomService.js";
import { UserService } from "@application/services/users/UserService.js";
import type { WSRoomData } from "@domain/model/value-object/room/Room.js";
import type { WSTournamentData } from "@domain/model/value-object/tournament/Tournament.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { TypeOrmUserRepository } from "@infrastructure/repository/users/TypeORMUserRepository.js";
import type { FastifyInstance } from "fastify";
import type { WebSocketContext } from "../../websocket/ws-manager.js";
import type { WSOutgoingMsg } from "../../websocket/ws-msg.js";
import { decodeJWT } from "../auth/authRoutes.js";

export async function registerRoomRoutes(app: FastifyInstance) {
	// 各サービスは自身でリポジトリを初期化するスタイルに変更
	// createRoomの場合は特別にroomIdなしでインスタンスを作成
	const userRepository = new TypeOrmUserRepository(
		AppDataSource.getRepository("UserEntity"),
	);
	const userService = new UserService(userRepository);

	// POST /rooms: ルーム作成 (変更なし)
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
			const room = await RoomService.createRoom(owner_id);
			console.log("create room success: ", room);
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
	context: WebSocketContext,
): Promise<WSOutgoingMsg> {
	if (context.joinedRoom === null) throw Error("joined no room");
	const room_service = RoomService.getInstance(context.joinedRoom);
	switch (action) {
		case "START": {
			if (
				await room_service.startRoom(context.joinedRoom, context.authedUser)
			) {
				return {
					// 本来不要　エラー時は注意
					status: "Room",
					data: {
						type: "none",
					},
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
	context: WebSocketContext,
): Promise<WSOutgoingMsg> {
	const room_service = RoomService.getInstance(context.joinedRoom);
	const room_user_service = RoomUserService.getInstance(context.joinedRoom);
	try {
		const succeeded = await room_user_service.joinRoom(
			context.authedUser,
			context.joinedRoom,
		);

		if (succeeded) {
			// 参加成功後、ルーム情報を取得
			const room = await room_service.getRoomById(context.joinedRoom);
			if (!room) {
				throw new Error("Failed to retrieve room info after joining.");
			}

			// レスポンスに users と roomInfo の両方を含める
			return {
				status: "Room",
				data: {
					action: "USER",
					users: await room_user_service.getAllRoomUsers(context.joinedRoom),
					roomInfo: {
						id: room.id,
						ownerId: room.ownerId,
						status: room.status,
					},
				} as WSRoomData, // 型定義を更新するまでは as でキャスト
			};
		} else {
			return { status: "error", msg: "failed to join room" };
		}
	} catch (error) {
		if (error instanceof Error) {
			return { status: "error", msg: error.message };
		}
		return { status: "error", msg: "unexpected error" };
	}
}

export async function LeaveRoomWS(
	context: WebSocketContext,
): Promise<WSOutgoingMsg> {
	const room_user_service = RoomUserService.getInstance(context.joinedRoom);
	try {
		const succeeded = await room_user_service.leaveRoom(context.authedUser);
		if (succeeded)
			return {
				status: "Room",
				data: {
					action: "USER",
					users: await room_user_service.getAllRoomUsers(context.joinedRoom),
				},
			};
		else return { status: "error", msg: "failed to leave room" };
	} catch (error) {
		if (error instanceof Error) {
			return { status: "error", msg: error.message };
		}
		throw Error("unexpected error");
	}
}
