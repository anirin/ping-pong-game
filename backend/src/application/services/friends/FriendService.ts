import type { FriendRepository } from "@domain/interface/repository/friends/FriendRepository.js";
import type { Friend } from "@domain/model/entity/friend/Friend.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { v4 as uuidv4 } from "uuid";

export class FriendService {
	constructor(private readonly friendRepository: FriendRepository) {}

	async getFriendList(id: UserId): Promise<Friend[] | null> {
		return this.friendRepository.findByUserId(id);
	}

	async getFriend(userId: UserId, friendId: UserId): Promise<Friend | null> {
		return this.friendRepository.findFriend(userId, friendId);
	}

	async getFriendPendingList(id: UserId): Promise<Friend[] | null> {
		return this.friendRepository.findPendingFriend(id);
	}

	async sendFriendRequest(userId: string, friendId: string) {
		if (userId === friendId) {
			throw new Error("自分自身にフレンド申請は送れません。");
		}
		const existing = await this.friendRepository.findByUserAndFriend(
			userId,
			friendId,
		);
		if (existing) {
			throw new Error("すでに申請済みです。");
		}

		const now = new Date();

		const record1 = this.friendRepository.create({
			id: uuidv4(),
			user_id: userId,
			friend_id: friendId,
			status: "pending_sent",
			requested_at: now,
		});

		const record2 = this.friendRepository.create({
			id: uuidv4(),
			user_id: friendId,
			friend_id: userId,
			status: "pending_received",
			requested_at: now,
		});
		await this.friendRepository.save([record1, record2]);
	}

	async acceptFriend(userId: string, friendId: string) {
		await this.friendRepository.updateStatus(userId, friendId, "accept");
		await this.friendRepository.updateStatus(friendId, userId, "accept");
	}

	async removeFriend(userId: string, friendId: string) {
		await this.friendRepository.removeByUserAndFriend(userId, friendId);
		await this.friendRepository.removeByUserAndFriend(friendId, userId);
	}
}
