import type { Room } from "@domain/model/entity/room/Room.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export interface RoomRepository {
	findById(id: RoomId): Promise<Room | null>;
	save(user: Room): Promise<void>;
	start(id: RoomId): Promise<void>;
	delete(id: RoomId): Promise<void>;
	findAllParticipants(id: RoomId): Promise<UserId[]>;
	findAll(): Promise<Room[]>;
}
