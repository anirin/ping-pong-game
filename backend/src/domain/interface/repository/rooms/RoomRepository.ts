import type { Room } from "@domain/model/entity/room/Room.js";
import type { User } from "@domain/model/entity/user/User.js";
import type { RoomId, RoomUser } from "@domain/model/value-object/room/Room.js";

export interface RoomRepository {
	findById(id: RoomId): Promise<Room | null>;
	save(room: Room): Promise<void>;
	start(id: RoomId): Promise<boolean>;
	delete(id: RoomId): Promise<boolean>;
	findAll(): Promise<Room[]>;
	findParticipants(roomid: RoomId): Promise<User[]>;
	storeParticipants(id: RoomId, participants: User[]): Promise<boolean>;
}
