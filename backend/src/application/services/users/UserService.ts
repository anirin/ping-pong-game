import { User } from "@domain/model/users/User.js";
import { Username } from "@domain/model/users/value-objects.js";
import type { UserRepository } from "@domain/repository/users/UserRepository.js";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export class UserService {
	constructor(private readonly userRepository: UserRepository) {}

	async createUser(username: string, password: string): Promise<User> {
		const passwordHash = await bcrypt.hash(password, 10); // パスワードハッシュ生成
		const user = new User(
			uuidv4(), // UUID生成
			new Username(username),
			passwordHash,
			"offline",
			new Date(),
		);
		await this.userRepository.save(user);
		return user;
	}

	async getUserById(id: string): Promise<User | null> {
		return this.userRepository.findById(id);
	}

	async updateStatus(id: string, status: string): Promise<User | null> {
		const user = await this.userRepository.findById(id);
		if (!user) throw new Error("User not found");
		user.setStatus(status as any); // UserStatusの型安全はUserクラスで保証
		await this.userRepository.save(user);
		return user;
	}
}
