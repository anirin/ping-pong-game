import type { RoomRepository } from "@domain/interface/repository/rooms/RoomRepository.js";
import { Room } from "@domain/model/entity/room/Room.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import { RoomEntity } from "@infrastructure/entity/rooms/RoomEntity.js";
import type { Repository } from "typeorm";
import type { UserId } from "@domain/model/value-object/user/User.js";

export class TypeOrmRoomRepository implements RoomRepository {
	constructor(private readonly repository: Repository<RoomEntity>) {}

	async findById(id: RoomId): Promise<Room | null> {
		const entity = await this.repository.findOne({ where: { id } });
		if (!entity) return null;
		return this.toDomain(entity);
	}

	async save(room: Room): Promise<void> {
		const entity = this.toEntity(room);
		await this.repository.save(entity);
	}

	async start(id: RoomId): Promise<void> {
		this.repository.manager.update(Room, { id: id }, { status: "playing" });
	}

	async delete(id: RoomId): Promise<void> {
		await this.repository.delete(id);
	}

	async findAll(): Promise<Room[]> {
		const entities = await this.repository.find();
		return entities.map((entity) => this.toDomain(entity));
	}

	async findAllParticipants(id: RoomId): Promise<UserId[]> {
		const target_room = await this.repository.findOne({ where: { id } });
		const userids: UserId[] = [];

		if (target_room === null) throw Error("no room found");
		const participants = target_room.room_participants;
		participants.forEach((p) => userids.push(p.user.id));
		return userids;
	}

	private toDomain(entity: RoomEntity): Room {
		return new Room(
			entity.id,
			entity.owner_id,
			entity.status,
			entity.mode,
			entity.room_type,
			entity.created_at,
		);
	}

	private toEntity(room: Room): RoomEntity {
		const entity = new RoomEntity();
		entity.id = room.id;
		entity.owner_id = room.ownerId;
		entity.status = room.status;
		entity.mode = room.mode;
		entity.room_type = room.roomType;
		entity.created_at = room.createdAt;
		entity.updated_at = new Date();
		return entity;
	}
}
