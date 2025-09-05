import bcrypt from "bcrypt";
import type {
	FriendId,
	FriendStatus,
} from "../../value-object/friend/Friend.js";
import type {
	AvatarUrl,
	UserId,
	Username,
	UserStatus,
} from "../../value-object/user/User.js";

export class Friend {
	public id: UserId;
	public friend_name: Username;
	public accept_status: FriendStatus;
	public online_status: UserStatus;
	public avatar_url: AvatarUrl | null;

	constructor(
		id: UserId,
		friend_name: Username,
		accept_status: FriendStatus,
		online_status: UserStatus,
		avatar_url: AvatarUrl | null,
	) {
		this.id = id;
		this.friend_name = friend_name;
		this.accept_status = accept_status;
		this.online_status = online_status;
		this.avatar_url = avatar_url;
	}
}
