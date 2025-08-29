import type { Room } from "@domain/model/entity/room/Room.js";
import type { User } from "@domain/model/entity/user/User.js";
import type { RoomId, RoomUser } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export interface RoomRepository {
	findById(id: RoomId): Promise<Room | null>;
	save(room: Room): Promise<void>;
	start(id: RoomId): Promise<boolean>;
	delete(id: RoomId): Promise<boolean>;
	join(room_id: RoomId, user: User): Promise<boolean>;
	leave(user: User): Promise<boolean>;
	findAll(): Promise<Room[]>;
	findAllParticipants(id: RoomId): Promise<RoomUser[]>;
}
