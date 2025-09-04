import type { Friend } from "@domain/model/entity/friend/Friend.js";
import type { FriendStatus } from "@domain/model/value-object/friend/Friend.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type { FriendEntity } from "@infrastructure/entity/friend/FriendEntity.js";

export interface FriendRepository {
	findByUserId(id: UserId): Promise<Friend[] | null>;
	save(records: FriendEntity[]): Promise<void>;
	create(data: Partial<FriendEntity>): FriendEntity;
	findByUserAndFriend(userId: string, friendId: string): Promise<Friend | null>;
	findPendingFriend(id: UserId): Promise<Friend[] | null>;
	findFriend(userId: UserId, friendId: UserId): Promise<Friend | null>;
	updateStatus(
		userId: string,
		friendId: string,
		status: FriendStatus,
	): Promise<void>;
	removeByUserAndFriend(userId: string, friendId: string): Promise<void>;
}
