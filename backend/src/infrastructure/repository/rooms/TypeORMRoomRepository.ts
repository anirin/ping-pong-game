import type { RoomRepository } from "@domain/interface/repository/rooms/RoomRepository.js";
import { Room } from "@domain/model/entity/room/Room.js";
import type { User } from "@domain/model/entity/user/User.js";
import type { RoomId, RoomUser } from "@domain/model/value-object/room/Room.js";
import {
	AvatarUrl,
	type UserId,
	Username,
} from "@domain/model/value-object/user/User.js";
import { RoomEntity } from "@infrastructure/entity/rooms/RoomEntity.js";
import { UserEntity } from "@infrastructure/entity/users/UserEntity.js";
import type { Repository } from "typeorm";
import type { DeleteResult, UpdateResult } from "typeorm/browser";

export class TypeOrmRoomRepository implements RoomRepository {
	constructor(private readonly repository: Repository<RoomEntity>) {}

	async findById(id: RoomId): Promise<Room | null> {
		const entity = await this.repository.findOne({
			where: { id },
			relations: ["participants"],
		});
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
		const result: DeleteResult = await this.repository.delete({ id: id });
		return (
			result.affected !== undefined &&
			result.affected !== null &&
			result.affected > 0
		);
	}

	async join(room_id: RoomId, user: User): Promise<boolean> {
		const room = await this.repository.findOne({
			where: { id: room_id },
			relations: ["participants"],
		});
		if (room === null || this.toDomain(room).isFull()) return false;
		room.participants.push(this.userToEntity(user));
		await this.repository.save(room);
		return true;
	}

	// for participants, not owner. for owner, use delete instead
	async leave(user: User): Promise<boolean> {
		const room_id = user._room_id;
		if (room_id === null) return false;
		const room = await this.repository.findOne({
			where: { id: room_id },
			relations: ["participants"],
		});
		if (
			room === null ||
			this.toDomain(room).isEmpty() ||
			this.toDomain(room).checkOwner(user.id)
		)
			return false;
		room.participants = room.participants.filter((p) => p.id !== user.id);
		await this.repository.save(room);
		return true;
	}

	async findAll(): Promise<Room[]> {
		const entities = await this.repository.find();
		return entities.map((entity) => this.toDomain(entity));
	}

	async findAllParticipants(id: RoomId): Promise<RoomUser[]> {
		const target_room = await this.repository.findOne({
			where: { id },
			relations: ["participants"],
		});
		const userids: RoomUser[] = [];

		if (!target_room) throw Error("no room found");
		const participants = target_room.participants;
		if (participants.length !== 0)
			participants.forEach((p) => {
				userids.push(this.extractRoomUser(p));
			});
		return userids;
	}

	private toDomain(entity: RoomEntity): Room {
		return new Room(
			entity.id,
			entity.owner_id,
			entity.participants,
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

	private extractRoomUser(user: UserEntity): RoomUser {
		const room_user: RoomUser = {
			id: user.id,
			name: new Username(user.username),
			avatar: user.avatar_url ? new AvatarUrl(user.avatar_url) : null,
			num_win: 0,
			num_lose: 0,
		};
		return room_user;
	}

	private userToEntity(user: User) {
		const entity = new UserEntity();
		entity.id = user.id;
		entity.email = user.email;
		entity.username = user.username.value;
		entity.avatar_url = user.avatar?.value ?? null;
		entity.status = user.status;
		entity.password_hash = user.getPasswordHash();
		entity.created_at = user.createdAt;
		entity.updated_at = new Date();

		// 2FA 情報を反映
		entity.twoFAEnabled = user.isTwoFAEnabled();
		entity.twoFASecret = user.getTwoFASecret() ?? null;

		return entity;
	}
}
