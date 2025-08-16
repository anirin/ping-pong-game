import type { User } from "@domain/model/entity/user/User.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export interface UserRepository {
	findById(id: UserId): Promise<User | null>;
	findByUsername(username: string): Promise<User | null>;
	findByEmail(email: string): Promise<User | null>; // ← 追加
	save(user: User): Promise<void>;
	update(user: User): Promise<void>;
	delete(id: UserId): Promise<void>;
	findAll(): Promise<User[]>;
}
