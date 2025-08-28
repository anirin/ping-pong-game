import type {
	RoomId,
	RoomMode,
	RoomStatus,
	RoomType,
} from "@domain/model/value-object/room/Room.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type { UserEntity } from "@infrastructure/entity/users/UserEntity.js";

export class Room {
	private _participants: UserId[] = [];
	private max_player = 0;

	constructor(
		public readonly id: RoomId,
		public readonly ownerId: UserId,
		public readonly participants: UserEntity[],
		public readonly status: RoomStatus = "waiting",
		public readonly mode: RoomMode = "online",
		public readonly roomType: RoomType = "1on1",
		public readonly createdAt: Date = new Date(),
	) {
		this.max_player = this.roomType === "1on1" ? 2 : 4;
		participants.forEach((p) => this._participants.push(p.id));
	}

	get allParticipants() {
		return [...this.participants];
	}

	// setAllParticipants(users: UserId[]) {
	// 	this.participants = users;
	// }

	isFull(): boolean {
		return this.participants.length >= this.max_player;
	}

	isEmpty(): boolean {
		return this.participants.length <= 0;
	}

	checkOwner(user: UserId): boolean {
		return user === this.ownerId;
	}

	// sendMessage(user: RoomParticipant, wsintf: WSInterface) {
	// 	user.websocket.send(JSON.stringify(wsintf));
	// }

	// setStatus(next: RoomStatus): void {
	// 	if (
	// 		!(
	// 			(this._status === "waiting" && next === "playing") ||
	// 			(this._status === "playing" && next !== "finished")
	// 		)
	// 	) {
	// 		throw new Error("invalid status");
	// 	}
	// 	this._status = next;
	// }

	// join(userId: UserId, ws: WebSocket) {
	// 	if (this._status !== "waiting")
	// 		throw new InvalidTransitionError("room not joinable");
	// 	if (this.participants.some((p) => p.userId === userId))
	// 		throw new AlreadyJoinedError("already joined");
	// 	if (this.participants.length >= this.max_player)
	// 		throw new RoomFullError("room full");
	// 	this.participants.forEach(
	// 		(p) =>
	// 			p.userId !== userId &&
	// 			this.sendMessage(p, { action: "JOIN", user: userId }),
	// 	);
	// 	this.participants.push(new RoomParticipant(userId, ws));
	// }

	// leave(userId: UserId): void {
	// 	const leaving = this.participants.find((p) => p.userId === userId);
	// 	if (leaving == undefined) throw new AlreadyJoinedError("not joined");
	// 	leaving?.websocket.close();
	// 	this.participants = this.participants.filter((p) => p.userId !== userId);
	// 	this.participants.forEach(
	// 		(p) =>
	// 			p.userId !== userId &&
	// 			this.sendMessage(p, { action: "LEAVE", user: userId }),
	// 	);
	// }

	// start() {
	// 	if (this._status !== "waiting")
	// 		throw new InvalidTransitionError("invalid transition");
	// 	if (this.participants.length < 2)
	// 		throw new InvalidTransitionError("need at least 2 players");
	// 	this._status = "playing";
	// }

	// delete(requester: UserId) {
	// 	if (!this.checkOwner(requester)) throw Error("not the room owner");
	// 	this.participants.forEach((p) =>
	// 		this.sendMessage(p, { action: "DELETE", user: requester }),
	// 	);
	// }

	// finish() {
	// 	if (this._status !== "playing")
	// 		throw new InvalidTransitionError("invalid transition");
	// 	this._status = "finished";
	// }
}
