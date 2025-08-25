import bcrypt from "bcrypt";
import type { UserId, UserStatus } from "../../value-object/user/User.js";
import { AvatarUrl, Username } from "../../value-object/user/User.js";
export class User {
	public readonly id: UserId;
	public readonly createdAt: Date;
	private _passwordHash: string;
	public readonly email: string;
	public username: Username;
	public avatar: AvatarUrl | null;
	private _status: UserStatus = "offline";
	private _twoFAEnabled: boolean = false;
	private _twoFASecret: string | null = null;

	constructor(
		id: UserId,
		email: string,
		username: Username,
		passwordHash: string,
		status: UserStatus = "offline",
		createdAt: Date,
		avatar?: AvatarUrl | null,
		twoFAEnabled: boolean = false,
		twoFASecret: string | null = null,
	) {
		this.id = id;
		this.email = email;
		this.createdAt = createdAt;
		this.username = username;
		this._passwordHash = passwordHash;
		this.avatar = avatar ?? null;
		this._status = status;
		this._twoFAEnabled = twoFAEnabled;
		this._twoFASecret = twoFASecret;
	}

	get status(): UserStatus {
		return this._status;
	}

	setStatus(next: UserStatus): void {
		const allowed = ["offline", "online", "busy", "away"] as const;
		if (!allowed.includes(next)) throw new Error("invalid status");
		this._status = next;
	}

	clearAvatar(): void {
		this.avatar = null;
	}

	changeAvatar(newAvatar: string) {
		this.avatar = new AvatarUrl(newAvatar);
	}

	getPasswordHash(): string {
		return this._passwordHash;
	}

	async verifyPassword(password: string): Promise<boolean> {
		return await bcrypt.compare(password, this._passwordHash);
	}

	async setPassword(password: string) {
		this._passwordHash = await bcrypt.hash(password, 10);
	}

	enableTwoFA(secret: string) {
		this.setTwoFA(secret, true);
	}

	disableTwoFA() {
		this.setTwoFA(null, false);
	}

	isTwoFAEnabled(): boolean {
		return this._twoFAEnabled;
	}

	getTwoFASecret(): string | null {
		return this._twoFASecret;
	}

	setTwoFA(secret: string | null, enabled: boolean) {
		this._twoFASecret = secret;
		this._twoFAEnabled = enabled;
	}
	changeUsername(newUsername: string) {
		this.username = new Username(newUsername);
	}
}
