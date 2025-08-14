import { User } from "@domain/model/users/User.js";
import { Username } from "@domain/model/users/value-objects.js";
import type { UserRepository } from "@domain/repository/users/UserRepository.js";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import qrcode from "qrcode";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export class AuthService {
	constructor(private readonly userRepo: UserRepository) {}

	// ユーザー登録
	async register(
		email: string,
		username: string,
		password: string,
	): Promise<string> {
		const existingUser = await this.userRepo.findByEmail(email);
		if (existingUser) throw new Error("User already exists");

		const hashedPassword = await bcrypt.hash(password, 10);

		const user = new User(
			randomUUID(), // id
			email, // email
			new Username(username), // username
			hashedPassword, // passwordHash
			"offline", // status
			new Date(), // createdAt
			null, // avatar
			false, // twoFAEnabled
			null, // twoFASecret
		);

		await this.userRepo.save(user);

		const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "24h" });
		return token;
	}

	// ログイン
	async login(
		email: string,
		password: string,
	): Promise<{ token?: string; twoFARequired?: boolean }> {
		const user = await this.userRepo.findByEmail(email);
		if (!user) throw new Error("User not found");

		const isMatch = await user.verifyPassword(password);
		if (!isMatch) throw new Error("Password mismatch");

		if (user.isTwoFAEnabled()) {
			return { twoFARequired: true };
		}

		const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "24h" });
		return { token };
	}

	// 2FA セットアップ
	async setup2FA(email: string) {
		const user = await this.userRepo.findByEmail(email);
		if (!user) throw new Error("User not found");

		const secret = authenticator.generateSecret();
		user.setTwoFA(secret, false); // enabled=false
		await this.userRepo.update(user);

		const otpauth = authenticator.keyuri(email, "MyApp", secret);
		const qrCodeImageUrl = await qrcode.toDataURL(otpauth);

		return { secret, otpauth_url: otpauth, qrCodeImageUrl };
	}

	// 2FA 確認
	async verify2FA(email: string, token: string) {
		const user = await this.userRepo.findByEmail(email);
		if (!user) throw new Error("User not found");

		const secret = user.getTwoFASecret();
		if (!secret) throw new Error("2FA not setup");

		const isValid = authenticator.verify({ token, secret });
		if (!isValid) throw new Error("Invalid 2FA token");

		user.setTwoFA(secret, true); // enabled=true
		await this.userRepo.update(user);

		const jwtToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: "24h" });
		return { token: jwtToken };
	}
}
