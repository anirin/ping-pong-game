import type { FriendRepository } from "@domain/interface/repository/friends/FriendRepository.js";
import { Friend } from "@domain/model/entity/friend/Friend.js";
import type { FriendStatus } from "@domain/model/value-object/friend/Friend.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { Username } from "@domain/model/value-object/user/User.js";
import type { FriendEntity } from "@infrastructure/entity/friend/FriendEntity.js";
import { UserEntity } from "@infrastructure/entity/users/UserEntity.js";
import type { Repository } from "typeorm";

export class TypeOrmFriendRepository implements FriendRepository {
	constructor(private readonly repository: Repository<FriendEntity>) {}

	async updateStatus(
		userId: string,
		friendId: string,
		status: FriendStatus,
	): Promise<void> {
		await this.repository.update(
			{ user_id: userId, friend_id: friendId },
			{ status },
		);
	}

	async removeByUserAndFriend(userId: string, friendId: string): Promise<void> {
		await this.repository.delete({ user_id: userId, friend_id: friendId });
	}

	async findFriend(userId: UserId, friendId: UserId): Promise<Friend | null> {
		const friend = await this.repository
			.createQueryBuilder("friend")
			.innerJoin(UserEntity, "users", "friend.friend_id = users.id")
			.select([
				"friend.friend_id AS id",
				"users.username AS friend_name",
				"friend.status AS acceptStatus",
				"users.status AS onlineStatus",
				"users.avatar_url AS avatar_url",
			])
			.where("friend.user_id = :userId", { userId })
			.andWhere("friend.friend_id = :friendId", { friendId })
			.getRawOne();
		if (!friend) return null;
		return this.toDomain(friend);
	}

	async findByUserId(id: UserId): Promise<Friend[] | null> {
		const friendList = await this.repository
			.createQueryBuilder("friend")
			.innerJoin(UserEntity, "users", "friend.friend_id = users.id")
			.select([
				"friend.friend_id AS id",
				"users.username AS friend_name",
				"friend.status AS acceptStatus",
				"users.status AS onlineStatus",
				"users.avatar_url AS avatar_url",
			])
			.where("friend.user_id = :id", { id })
			.andWhere("friend.status = :status", { status: "accept" })
			.getRawMany();
		if (!friendList) return null;
		return friendList.map((row) => this.toDomain(row));
	}

	async findPendingFriend(id: UserId): Promise<Friend[] | null> {
		const friendList = await this.repository
			.createQueryBuilder("friend")
			.innerJoin(UserEntity, "users", "friend.friend_id = users.id")
			.select([
				"friend.friend_id AS id",
				"users.username AS friend_name",
				"friend.status AS acceptStatus",
				"users.status AS onlineStatus",
				"users.avatar_url AS avatar_url",
			])
			.where("friend.user_id = :id", { id })
			.andWhere("friend.status = :status", { status: "pending_received" })
			.getRawMany();
		if (!friendList) return null;
		return friendList.map((row) => this.toDomain(row));
	}

	async findByUserAndFriend(
		userId: string,
		friendId: string,
	): Promise<Friend | null> {
		const result = await this.repository.findOne({
			where: { user_id: userId, friend_id: friendId },
		});
		if (!result) return null;
		return this.toDomain(result);
	}

	async save(records: FriendEntity[]): Promise<void> {
		await this.repository.save(records);
	}

	create(data: Partial<FriendEntity>): FriendEntity {
		return this.repository.create(data);
	}

	private toDomain(row: any): Friend {
		return new Friend(
			row.id,
			row.friend_name,
			row.acceptStatus,
			row.onlineStatus,
			row.avatar_url,
		);
	}
}
