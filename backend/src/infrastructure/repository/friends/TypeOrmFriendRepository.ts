import type { FriendRepository } from "@domain/interface/repository/friends/FriendRepository.js";
import { Friend } from "@domain/model/entity/friend/Friend.js";
import type { FriendStatus } from "@domain/model/value-object/friend/Friend.js";
import type { UserId, Username } from "@domain/model/value-object/user/User.js";
import type { FriendEntity } from "@infrastructure/entity/friend/FriendEntity.js";
import { UserEntity } from "@infrastructure/entity/users/UserEntity.js";
import type { Repository } from "typeorm";

export class TypeOrmFriendRepository implements FriendRepository {
	constructor(private readonly repository: Repository<FriendEntity>) {}

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
			.getRawMany();
		if (!friendList) return null;
		return friendList.map((row) => this.toDomain(row));
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
