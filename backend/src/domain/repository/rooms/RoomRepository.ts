import type { Room } from "@domain/model/rooms/Room.js";
import type { RoomId } from "@domain/model/rooms/value-objects.js";

export interface RoomRepository {
	findById(id: RoomId): Promise<Room | null>;
	save(user: Room): Promise<void>;
	delete(id: RoomId): Promise<void>;
	findAll(): Promise<Room[]>;
}
