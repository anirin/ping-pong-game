import type { UserRepository } from "@domain/interface/repository/users/UserRepository.js";
import { User } from "@domain/model/entity/user/User.js";
import { Username } from "@domain/model/value-object/user/User.js";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export class UserService {
	constructor(private readonly userRepository: UserRepository) {}

	async createUser(username: string, password: string): Promise<User> {
		const passwordHash = await bcrypt.hash(password, 10); // パスワードハッシュ生成

		const user = new User(
			uuidv4(), // id
			username, // email を username と同じ文字列に仮置き
			new Username(username), // username
			passwordHash, // passwordHash
			"offline", // status
			new Date(), // createdAt
			null, // avatar
			false, // twoFAEnabled
			null, // twoFASecret
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
