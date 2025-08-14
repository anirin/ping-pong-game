import { Room } from "@domain/model/rooms/Room.js";
import { User } from "@domain/model/users/User.js";
import { Username } from "@domain/model/users/value-objects.js";
import type { RoomRepository } from "@domain/repository/rooms/RoomRepository.js";
import type { UserRepository } from "@domain/repository/users/UserRepository.js";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export class RoomService {
	constructor(private readonly roomRepository: RoomRepository) {}

	async createRoom(owner_id: string): Promise<Room> {
		const room = new Room(uuidv4(), owner_id);
		await this.roomRepository.save(room);
		return room;
	}

	async getRoomById(id: string): Promise<Room | null> {
		return this.roomRepository.findById(id);
	}

	async updateStatus(id: string, status: string): Promise<Room | null> {
		const user = await this.roomRepository.findById(id);
		if (!user) throw new Error("User not found");
		user.setStatus(status as any);
		await this.roomRepository.save(user);
		return user;
	}
}
