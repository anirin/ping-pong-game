import type { Role } from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import {
	AlreadyJoinedError,
	InvalidTransitionError,
} from "../../common/errors.js";
import type {
	RoomId,
	RoomMode,
	RoomStatus,
	RoomType,
} from "@domain/model/value-object/room/Room.js";

export class RoomParticipant {
	constructor(
		public readonly userId: UserId,
		public readonly role: Role,
	) {}
}

export class Room {
	private participants: RoomParticipant[] = [];

	constructor(
		public readonly id: RoomId,
		public readonly ownerId: UserId,
		private _status: RoomStatus = "waiting",
		public readonly mode: RoomMode = "online",
		public readonly roomType: RoomType = "1on1",
		public readonly createdAt: Date = new Date(),
		// private readonly rules: EffectiveRuleSet,
	) {}

	get status() {
		return this._status;
	}
	get allParticipants() {
		return [...this.participants];
	}
	get playersCount() {
		return this.participants.filter((p) => p.role === "player").length;
	}
	// get effectiveRules() { return this.rules }

	setStatus(next: RoomStatus): void {
		if (
			!(
				(this._status === "waiting" && next === "playing") ||
				(this._status === "playing" && next !== "finished")
			)
		) {
			throw new Error("invalid status");
		}
		this._status = next;
	}

	join(userId: UserId, role: Role = "player") {
		if (this._status !== "waiting")
			throw new InvalidTransitionError("room not joinable");
		if (this.participants.some((p) => p.userId === userId))
			throw new AlreadyJoinedError("already joined");
		// if (role === 'player' && this.playersCount >= (this.rules.maxPlayers ?? Number.MAX_SAFE_INTEGER))
		// 	throw new RoomFullError('room full')
		this.participants.push(new RoomParticipant(userId, role));
	}

	leave(userId: UserId): void {
		const before = this.participants.length;
		this.participants = this.participants.filter((p) => p.userId !== userId);
		if (before === this.participants.length)
			throw new AlreadyJoinedError("not joined");
	}

	start() {
		if (this._status !== "waiting")
			throw new InvalidTransitionError("invalid transition");
		if (this.playersCount < 2)
			throw new InvalidTransitionError("need at least 2 players");
		this._status = "playing";
	}

	finish() {
		if (this._status !== "playing")
			throw new InvalidTransitionError("invalid transition");
		this._status = "finished";
	}
}
