import type { FriendRepository } from "@domain/interface/repository/friends/FriendRepository.js";
import type { Friend } from "@domain/model/entity/friend/Friend.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { v4 as uuidv4 } from "uuid";

export class FriendService {
	constructor(private readonly friendRepository: FriendRepository) {}

	async getFriendList(id: UserId): Promise<Friend[] | null> {
		return this.friendRepository.findByUserId(id);
	}
}
