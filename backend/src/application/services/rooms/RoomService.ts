import type { RoomRepository } from "@domain/interface/repository/rooms/RoomRepository.js";
import type { UserRepository } from "@domain/interface/repository/users/UserRepository.js";
import { Room } from "@domain/model/entity/room/Room.js";
import type { RoomId, RoomUser } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { TypeOrmRoomRepository } from "@infrastructure/repository/rooms/TypeORMRoomRepository.js";
import { TypeOrmUserRepository } from "@infrastructure/repository/users/TypeORMUserRepository.js";
import type { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";

export class RoomService {
	private readonly roomRepository: RoomRepository;

	constructor(private readonly eventEmitter: EventEmitter) {
		this.roomRepository = new TypeOrmRoomRepository(
			AppDataSource.getRepository("RoomEntity"),
		);
	}

	async createRoom(owner_id: string): Promise<Room> {
		const room = new Room(uuidv4(), owner_id, []);
		await this.roomRepository.save(room);
		return room;
	}

	async getRoomById(id: string): Promise<Room | null> {
		return this.roomRepository.findById(id);
	}

	async startRoom(id: string, userid: UserId): Promise<boolean> {
		const room = await this.roomRepository.findById(id);
		if (room === null) return false;
		if (room.ownerId === userid && room.status === "waiting") {
			const result = await this.roomRepository.start(id);
			if (result) {
				// ルームが正常に開始された場合にイベントを発火
				console.log("🚀 RoomService: Emitting room.started event", {
					roomId: id,
					participants: room.participants,
					createdBy: userid,
					listenerCount: this.eventEmitter.listenerCount("room.started"),
				});

				this.eventEmitter.emit("room.started", {
					roomId: id,
					participants: room.participants,
					createdBy: userid,
				});

				console.log("✅ RoomService: room.started event emitted successfully");
			}
			return result;
		}
		return false;
	}

	async deleteRoom(id: string, userid: UserId): Promise<boolean> {
		const room = await this.roomRepository.findById(id);
		if (room === null) return false;
		if (room.ownerId === userid && room.status === "waiting")
			return this.roomRepository.delete(id);
		return false;
	}

	async getAllParticipants(id: string): Promise<RoomUser[]> {
		return this.roomRepository.findAllParticipants(id);
	}

	async checkOwner(id: string): Promise<boolean> {
		const room = await this.roomRepository.findById(id);
		if (room === null) return false;
		return room.ownerId === id;
	}
}

export class RoomUserService {
	private readonly userRepository: UserRepository;
	private readonly roomRepository: RoomRepository;

	constructor() {
		this.userRepository = new TypeOrmUserRepository(
			AppDataSource.getRepository("UserEntity"),
		);
		this.roomRepository = new TypeOrmRoomRepository(
			AppDataSource.getRepository("RoomEntity"),
		);
	}

	async joinRoom(userid: UserId, roomid: RoomId): Promise<boolean> {
		console.log("🔍 RoomUserService: Attempting to join room", {
			userId: userid,
			roomId: roomid,
		});

		const user = await this.userRepository.findById(userid);
		if (user == null) {
			console.error("❌ RoomUserService: User not found", { userId: userid });
			throw Error("no user found");
		}

		console.log("✅ RoomUserService: User found", {
			userId: userid,
			userName: user.username,
		});

		const result = await this.roomRepository.join(roomid, user);
		console.log("🎯 RoomUserService: joinRoom result", {
			userId: userid,
			roomId: roomid,
			success: result,
		});

		return result;
	}

	async leaveRoom(userid: UserId): Promise<boolean> {
		const user = await this.userRepository.findById(userid);
		if (user == null) throw Error("no user found");
		return await this.roomRepository.leave(user);
	}

	async getAllParticipants(id: string): Promise<RoomUser[]> {
		return this.roomRepository.findAllParticipants(id);
	}
}
