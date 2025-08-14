import type { User } from "@domain/model/users/User.js";
import type { UserId } from "@domain/model/users/value-objects.js";

export interface UserRepository {
	findById(id: UserId): Promise<User | null>;
	findByUsername(username: string): Promise<User | null>;
	save(user: User): Promise<void>;
	delete(id: UserId): Promise<void>;
	findAll(): Promise<User[]>;
}
