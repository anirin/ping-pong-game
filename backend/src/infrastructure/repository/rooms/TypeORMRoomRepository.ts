import type { RoomRepository } from "@domain/interface/repository/rooms/RoomRepository.js";
import { Room } from "@domain/model/entity/room/Room.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { RoomEntity } from "@infrastructure/entity/rooms/RoomEntity.js";
import { RoomParticipantEntity } from "@infrastructure/entity/rooms/RoomParticipantEntity.js";
import type { Repository } from "typeorm";
import type { DeleteResult, UpdateResult } from "typeorm/browser";
import { v4 as uuidv4 } from "uuid";

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

	async start(id: RoomId): Promise<boolean> {
		const result: UpdateResult = await this.repository.manager.update(
			RoomEntity,
			{ id: id },
			{ status: "playing" },
		);
		return result.affected !== undefined && result.affected > 0;
	}

	async delete(id: RoomId): Promise<boolean> {
		const result: DeleteResult = await this.repository.delete(id);
		return (
			result.affected !== undefined &&
			result.affected !== null &&
			result.affected > 0
		);
	}

	// async join(room_id: RoomId, user_id: UserId): Promise<boolean> {
	// 	const room = await this.repository.findOne({ where: { id: room_id } });
	// 	if (room === null || this.toDomain(room).isFull()) return false;
	// 	const participants = room.room_participants;
	// 	const requester = new RoomParticipantEntity();
	// 	requester.id = uuidv4();
	// 	requester.room = room_id;
	// 	requester.user = user_id;
	// 	participants.push(requester);
	// 	const result: UpdateResult = await this.repository.manager.update(RoomEntity, { id: room_id }, { room_participants:  })
	// }

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
