import type { RoomRepository } from "@domain/interface/repository/rooms/RoomRepository.js";
import type { UserRepository } from "@domain/interface/repository/users/UserRepository.js";
import { Room } from "@domain/model/entity/room/Room.js";
import type { User } from "@domain/model/entity/user/User.js";
import type { RoomId, RoomUser } from "@domain/model/value-object/room/Room.js";
import {
	AvatarUrl,
	type UserId,
	Username,
} from "@domain/model/value-object/user/User.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { TypeOrmRoomRepository } from "@infrastructure/repository/rooms/TypeORMRoomRepository.js";
import { TypeOrmUserRepository } from "@infrastructure/repository/users/TypeORMUserRepository.js";
import type { WSOutgoingMsg } from "@presentation/route/websocket/ws-msg.js";
import { v4 as uuidv4 } from "uuid";

export class RoomService {
	private readonly roomRepository: RoomRepository;

	constructor() {
		const repository = new TypeOrmRoomRepository(
			AppDataSource.getRepository("RoomEntity"),
		);
		this.roomRepository = repository;
	}

	async createRoom(owner_id: string): Promise<Room> {
		const room = new Room(uuidv4(), owner_id, []);
		await this.roomRepository.save(room);
		return room;
	}

	async getRoomById(roomid: string): Promise<Room | null> {
		return this.roomRepository.findById(roomid);
	}

	async startRoom(roomid: string, userid: UserId): Promise<boolean> {
		const room = await this.roomRepository.findById(roomid);
		if (room === null) return false;
		if (room.ownerId === userid && room.status === "waiting")
			return this.roomRepository.start(roomid);
		return false;
	}

	async deleteRoom(roomid: string, userid: UserId): Promise<boolean> {
		const room = await this.roomRepository.findById(roomid);
		if (room === null) return false;
		if (room.ownerId === userid && room.status === "waiting")
			return this.roomRepository.delete(roomid);
		return false;
	}

	async checkOwner(id: string, userid: UserId): Promise<boolean> {
		const room = await this.roomRepository.findById(id);
		if (room === null) throw Error("no room found");
		return room.ownerId === userid;
	}
}

export class RoomUserService {
	private readonly userRepository: UserRepository;
	private readonly roomRepository: RoomRepository;

	constructor() {
		const u_repository = new TypeOrmUserRepository(
			AppDataSource.getRepository("UserEntity"),
		);
		const r_repository = new TypeOrmRoomRepository(
			AppDataSource.getRepository("RoomEntity"),
		);
		this.userRepository = u_repository;
		this.roomRepository = r_repository;
	}

	async joinRoom(userid: UserId, roomid: RoomId): Promise<boolean> {
		const user = await this.userRepository.findById(userid);
		if (!user) throw Error("no user found");
		const room = await this.roomRepository.findById(roomid);
		if (!room) throw Error("no room found");
		if (room.isFull()) throw Error("the room is full");
		const participants = await this.roomRepository.findParticipants(roomid);
		participants.push(user);
		return this.roomRepository.storeParticipants(roomid, participants);
	}

	async leaveRoom(userid: UserId): Promise<boolean> {
		const user = await this.userRepository.findById(userid);
		if (!user) throw Error("no user found");
		const roomid = user._room_id;
		if (!roomid) throw Error("user not in room");
		const room = await this.roomRepository.findById(roomid);
		if (!room) throw Error("no roon found");
		if (room.isEmpty()) throw Error("no one is in the room");
		if (room.checkOwner(userid))
			throw Error("owner cannot leave without deleting the room");
		const newParticipants = room.allParticipants.filter((p) => p.id !== userid);
		return this.roomRepository.storeParticipants(roomid, newParticipants);
	}

	async getAllRoomUsers(id: string): Promise<RoomUser[]> {
		return (await this.roomRepository.findParticipants(id)).map((p) =>
			this.extractRoomUser(p),
		);
	}

	private extractRoomUser(user: User): RoomUser {
		const room_user: RoomUser = {
			id: user.id,
			name: user.username,
			avatar: user.avatar,
			num_win: 0,
			num_lose: 0,
		};
		return room_user;
	}
}
