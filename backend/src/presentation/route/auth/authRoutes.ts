import { AuthService } from "@application/auth/AuthService.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { UserEntity } from "@infrastructure/entity/users/UserEntity.js";
import { TypeOrmUserRepository } from "@infrastructure/repository/users/TypeORMUserRepository.js";
import {
	BcryptPasswordHasher,
	JwtTokenService,
	OtplibTwoFactorAuthService,
	QrCodeService,
} from "@infrastructure/jwt_2fa/logic.js";
import type { FastifyPluginAsync } from "fastify";
import validator from "validator";

// Repository
const userRepo = new TypeOrmUserRepository(
	AppDataSource.getRepository(UserEntity),
);

// Infrastructure implementations
const hasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService();
const twoFAService = new OtplibTwoFactorAuthService();
const qrCodeService = new QrCodeService();

// AuthService with dependencies
const authService = new AuthService(
	userRepo,
	hasher,
	tokenService,
	twoFAService,
	qrCodeService,
);

interface RegisterBody {
	email?: string;
	username?: string;
	password?: string;
}

interface LoginBody {
	email?: string;
	password?: string;
}

interface TwoFABody {
	email?: string;
	token?: string;
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
	// 新規登録
	fastify.post<{ Body: RegisterBody }>("/register", async (request, reply) => {
		const { email, username, password } = request.body;

		if (!email || !validator.isEmail(email)) {
			return reply.code(400).send({ message: "Invalid email" });
		}
		if (!username || username.length < 3) {
			return reply.code(400).send({ message: "Invalid username" });
		}
		if (!password || password.length < 6) {
			return reply.code(400).send({ message: "Invalid password" });
		}

		try {
			const token = await authService.register(email, username, password);
			return { token };
		} catch (err: any) {
			return reply.code(400).send({ message: err.message });
		}
	});

	// ログイン
	fastify.post<{ Body: LoginBody }>("/login", async (request, reply) => {
		const { email, password } = request.body;

		if (!email || !password) {
			return reply.code(400).send({ message: "Email and password required" });
		}

		try {
			const result = await authService.login(email, password);
			return result;
		} catch (err: any) {
			return reply.code(400).send({ message: err.message });
		}
	});

	// 2FA セットアップ
	fastify.post<{ Body: { email?: string } }>(
		"/2fa/setup",
		async (request, reply) => {
			const { email } = request.body;
			if (!email) return reply.code(400).send({ message: "Email required" });

			try {
				const result = await authService.setup2FA(email);
				return result;
			} catch (err: any) {
				return reply.code(400).send({ message: err.message });
			}
		},
	);

	// 2FA 検証
	fastify.post<{ Body: TwoFABody }>("/2fa/verify", async (request, reply) => {
		const { email, token } = request.body;
		if (!email || !token)
			return reply.code(400).send({ message: "Email and token required" });

		try {
			const result = await authService.verify2FA(email, token);
			return result;
		} catch (err: any) {
			return reply.code(400).send({ message: err.message });
		}
	});
};

export default authRoutes;
