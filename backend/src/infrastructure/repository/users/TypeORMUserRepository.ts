import type { UserRepository } from "@domain/interface/repository/users/UserRepository.js";
import { User } from "@domain/model/entity/user/User.js";
import {
	AvatarUrl,
	type UserId,
	Username,
	type UserStatus,
} from "@domain/model/value-object/user/User.js";
import { UserEntity } from "@infrastructure/entity/users/UserEntity.js";
import type { Repository } from "typeorm";

export class TypeOrmUserRepository implements UserRepository {
	constructor(private readonly repository: Repository<UserEntity>) {}

	async findById(id: UserId): Promise<User | null> {
		const entity = await this.repository.findOne({ where: { id } });
		if (!entity) return null;
		return this.toDomain(entity);
	}

	async findByUsername(username: string): Promise<User | null> {
		const entity = await this.repository.findOne({ where: { username } });
		if (!entity) return null;
		return this.toDomain(entity);
	}

	async findByEmail(email: string): Promise<User | null> {
		const entity = await this.repository.findOne({ where: { email } });
		if (!entity) return null;
		return this.toDomain(entity);
	}

	async save(user: User): Promise<void> {
		const entity = this.toEntity(user);
		await this.repository.save(entity);
	}

	async update(user: User): Promise<void> {
		const entity = this.toEntity(user);
		await this.repository.update(user.id, entity);
	}

	async delete(id: UserId): Promise<void> {
		await this.repository.delete(id);
	}

	async findAll(): Promise<User[]> {
		const entities = await this.repository.find();
		return entities.map((entity) => this.toDomain(entity));
	}

	private toDomain(entity: UserEntity): User {
		const user = new User(
			entity.id,
			entity.email,
			new Username(entity.username),
			entity.password_hash,
			entity.status as UserStatus,
			entity.created_at,
			entity.avatar_url ? new AvatarUrl(entity.avatar_url) : null,
			entity.twoFAEnabled ?? false,
			entity.twoFASecret ?? null,
		);

		return user;
	}

	private toEntity(user: User): UserEntity {
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
