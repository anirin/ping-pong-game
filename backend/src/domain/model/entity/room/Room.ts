import type {
	RoomId,
	RoomMode,
	RoomStatus,
	RoomType,
} from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type { UserEntity } from "@infrastructure/entity/users/UserEntity.js";
import type { User } from "../user/User.js";

export class Room {
	private _participants: User[];
	private max_player = 0;

	constructor(
		public readonly id: RoomId,
		public readonly ownerId: UserId,
		public readonly participants: User[],
		public readonly status: RoomStatus = "waiting",
		public readonly mode: RoomMode = "online",
		public readonly roomType: RoomType = "1on1",
		public readonly createdAt: Date = new Date(),
	) {
		// this.max_player = this.roomType === "1on1" ? 2 : 4;
		this.max_player = 4;
		this._participants = participants;
	}

	get allParticipants() {
		return [...this._participants];
	}

	setParticipants(new_participants: User[]) {
		this._participants = new_participants;
	}

	isFull(): boolean {
		return this.participants.length >= this.max_player;
	}

	isEmpty(): boolean {
		return this.participants.length <= 0;
	}

	checkOwner(user: UserId): boolean {
		return user === this.ownerId;
	}
}
