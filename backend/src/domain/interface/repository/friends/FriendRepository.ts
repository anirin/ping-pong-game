import type { Friend } from "@domain/model/entity/friend/Friend.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export interface FriendRepository {
	findByUserId(id: UserId): Promise<Friend[] | null>;
}
