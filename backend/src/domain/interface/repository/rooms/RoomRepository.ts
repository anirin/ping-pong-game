import type { Room } from "@domain/model/entity/room/Room.js";
import type { RoomId } from "@domain/model/entity/room/value-objects.js";

export interface RoomRepository {
	findById(id: RoomId): Promise<Room | null>;
	save(user: Room): Promise<void>;
	delete(id: RoomId): Promise<void>;
	findAll(): Promise<Room[]>;
}
