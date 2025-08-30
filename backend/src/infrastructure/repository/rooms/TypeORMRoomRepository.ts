import type { RoomRepository } from "@domain/interface/repository/rooms/RoomRepository.js";
import { Room } from "@domain/model/entity/room/Room.js";
import { User } from "@domain/model/entity/user/User.js";
import type { RoomId, RoomUser } from "@domain/model/value-object/room/Room.js";
import {
	AvatarUrl,
	type UserId,
	Username,
	type UserStatus,
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

	async findAll(): Promise<Room[]> {
		const entities = await this.repository.find();
		return entities.map((entity) => this.toDomain(entity));
	}

	async findParticipants(id: RoomId): Promise<User[]> {
		const room = await this.repository.findOne({
			where: { id },
			relations: ["participants"],
		});
		const userids: User[] = [];

		if (!room) return [];
		const participants = room.participants;
		if (participants.length !== 0)
			participants.forEach((p) => {
				userids.push(this.userToDomain(p));
			});
		return userids;
	}

	async storeParticipants(id: RoomId, participants: User[]): Promise<boolean> {
		const room = await this.repository.findOne({
			where: { id },
			relations: ["participants"],
		});
		if (!room) return false;
		const participants_entity: UserEntity[] = [];
		participants.forEach((p) => {
			participants_entity.push(this.userToEntity(p));
		});
		room.participants = participants_entity;
		await this.repository.save(room);
		return true;
	}

	private toDomain(entity: RoomEntity): Room {
		return new Room(
			entity.id,
			entity.owner_id,
			entity.participants.map((p) => this.userToDomain(p)),
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
		entity.participants = room.participants.map((p) => this.userToEntity(p));
		entity.status = room.status;
		entity.mode = room.mode;
		entity.room_type = room.roomType;
		entity.created_at = room.createdAt;
		entity.updated_at = new Date();
		return entity;
	}

	private userToDomain(entity: UserEntity): User {
		const user = new User(
			entity.id,
			entity.email,
			new Username(entity.username),
			entity.password_hash,
			entity.status as UserStatus,
			entity.created_at,
			entity.avatar_url ? new AvatarUrl(entity.avatar_url) : null,
			entity.room ? entity.room.id : null,
			entity.twoFAEnabled ?? false,
			entity.twoFASecret ?? null,
		);
		return user;
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
