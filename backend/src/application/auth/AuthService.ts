import type {
	PasswordHasher,
	QrCodeGenerator,
	TokenService,
	TwoFactorAuthService,
} from "@domain/interface/repository/users/AuthRepository.js";
import type { UserRepository } from "@domain/interface/repository/users/UserRepository.js";
import { User } from "@domain/model/entity/user/User.js";
import { Username } from "@domain/model/value-object/user/User.js";
import { VaultService } from "@infrastructure/vault/VaultService.js";
import { randomUUID } from "crypto";

export class AuthService {
	private vaultService: VaultService;

	constructor(
		private readonly userRepo: UserRepository,
		private readonly hasher: PasswordHasher,
		private readonly tokenService: TokenService,
		private readonly twoFAService: TwoFactorAuthService,
		private readonly qrCodeService: QrCodeGenerator,
	) {
		this.vaultService = new VaultService();
	}

	async register(
		email: string,
		username: string,
		password: string,
	): Promise<{ success: boolean }> {
		const existingUserByEmail = await this.userRepo.findByEmail(email);
		if (existingUserByEmail) throw new Error("Email already exists");

		const existingUserByUsername = await this.userRepo.findByUsername(username);
		if (existingUserByUsername) throw new Error("Username already exists");

		const hashedPassword = await this.hasher.hash(password, 10);

		const user = new User(
			randomUUID(),
			email,
			new Username(username),
			hashedPassword,
			"offline",
			new Date(),
			null,
			null,
			false,
			null,
		);

		await this.userRepo.save(user);

		return { success: true };
	}

	async login(
		email: string,
		password: string,
	): Promise<{
		twoFARequired: boolean;
		token?: string;
		tempToken?: string;
	}> {
		const user = await this.userRepo.findByEmail(email);
		if (!user) throw new Error("User not found");

		const isMatch = await this.hasher.compare(password, user.getPasswordHash());
		if (!isMatch) throw new Error("Password mismatch");

		if (user.isTwoFAEnabled()) {
			const tempPayload = { id: user.id, type: "2fa-pending" };
			const jwtSecret = await this.vaultService.getJwtSecret();
			const tempToken = this.tokenService.sign(tempPayload, jwtSecret, {
				expiresIn: "5m",
			});
			return { twoFARequired: true, tempToken };
		}
		user.setStatus("online");
		await this.userRepo.update(user);
		const payload = {
			id: user.id,
			email: user.email,
			username: user.username.value,
		};
		const jwtSecret = await this.vaultService.getJwtSecret();
		const token = this.tokenService.sign(payload, jwtSecret, {
			expiresIn: "24h",
		});
		return { twoFARequired: false, token };
	}

	// 2FA セットアップ
	async setup2FA(email: string) {
		const user = await this.userRepo.findByEmail(email);
		if (!user) throw new Error("User not found");

		const secret = this.twoFAService.generateSecret();
		user.setTwoFA(secret, false);
		await this.userRepo.update(user);

		const otpauth = this.twoFAService.keyuri(email, "MyApp", secret);
		const qrCodeImageUrl = await this.qrCodeService.toDataURL(otpauth);

		return { secret, otpauth_url: otpauth, qrCodeImageUrl };
	}

	// 2FA 検証
	async verify2FA(email: string, token: string) {
		const user = await this.userRepo.findByEmail(email);
		if (!user) throw new Error("User not found");

		const secret = user.getTwoFASecret();
		if (!secret) throw new Error("2FA is not set up for this user");

		const isValid = this.twoFAService.verify(token, secret);
		if (!isValid) throw new Error("Invalid 2FA token");

		if (!user.isTwoFAEnabled()) {
			user.setTwoFA(secret, true);
			// await this.userRepo.update(user);
		}
		user.setStatus("online");
		await this.userRepo.update(user);
		const payload = {
			id: user.id,
			email: user.email,
			username: user.username.value,
		};
		const jwtSecret = await this.vaultService.getJwtSecret();
		const jwtToken = this.tokenService.sign(payload, jwtSecret, {
			expiresIn: "24h",
		});
		return { token: jwtToken };
	}
	async logout(userId: string): Promise<void> {
		const user = await this.userRepo.findById(userId);
		if (!user || user.status === "offline") {
			return;
		}
		user.setStatus("offline");
		await this.userRepo.update(user);
	}
}
