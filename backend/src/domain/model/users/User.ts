import type {
	AvatarUrl,
	UserId,
	Username,
	UserStatus,
} from "./value-objects.js";

export class User {
	public readonly id: UserId;
	public readonly createdAt: Date;
	public readonly passwordHash: string;
	public username: Username;
	public avatar: AvatarUrl | null;
	private _status: UserStatus = "offline";

	constructor(
		id: UserId,
		username: Username,
		passwordHash: string,
		status: UserStatus = "offline",
		createdAt: Date,
		avatar?: AvatarUrl | null,
	) {
		this.id = id;
		this.createdAt = createdAt;
		this.username = username;
		this.passwordHash = passwordHash;
		this.avatar = avatar ?? null;
		this.setStatus(status);
	}

	get status(): UserStatus {
		return this._status;
	}

	setStatus(next: UserStatus): void {
		if (
			next !== "offline" &&
			next !== "online" &&
			next !== "busy" &&
			next !== "away"
		) {
			throw new Error("invalid status");
		}
		this._status = next;
	}

	clearAvatar(): void {
		this.avatar = null;
	}
}
