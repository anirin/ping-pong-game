import { AuthService } from "@application/auth/AuthService.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import {
	BcryptPasswordHasher,
	JwtTokenService,
	OtplibTwoFactorAuthService,
	QrCodeService,
} from "@infrastructure/entity/jwt_2fa/logic.js";
import { UserEntity } from "@infrastructure/entity/users/UserEntity.js";
import { TypeOrmUserRepository } from "@infrastructure/repository/users/TypeORMUserRepository.js";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import validator from "validator";

declare module "fastify" {
	interface FastifyRequest {
		authedUser: {
			id: string;
		};
	}
}

export function decodeJWT(
	fastify: FastifyInstance,
	token: string,
): string | null {
	try {
		const decoded = fastify.jwt.decode(token) as { id: string };
		if (!decoded || !decoded.id) {
			return null;
		}
		return decoded.id;
	} catch (err) {
		console.error("Error decoding JWT:", err);
		return null;
	}
}

const userRepo = new TypeOrmUserRepository(
	AppDataSource.getRepository(UserEntity),
);
const hasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService();
const twoFAService = new OtplibTwoFactorAuthService();
const qrCodeService = new QrCodeService();
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
	fastify.addHook("onRequest", async (request, reply) => {
		if (request.url !== "/auth/logout") {
			return;
		}

		try {
			const authHeader = request.headers.authorization;
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply
					.code(401)
					.send({ message: "Authentication token is missing or invalid." });
			}
			const token = authHeader.substring(7);

			const decoded = fastify.jwt.verify(token) as { id: string };

			request.authedUser = { id: decoded.id };
		} catch (err) {
			return reply.code(401).send({ message: "Authentication failed." });
		}
	});

	fastify.post<{ Body: RegisterBody }>("/register", async (request, reply) => {
		const { email: rawEmail, username: rawUsername, password } = request.body;
		const email = rawEmail ? validator.trim(rawEmail) : "";
		const username = rawUsername
			? validator.escape(validator.trim(rawUsername))
			: "";

		if (!validator.isEmail(email)) {
			return reply.code(400).send({ message: "Invalid email" });
		}
		if (username.length < 3) {
			return reply
				.code(400)
				.send({ message: "Username must be at least 3 characters long" });
		}
		if (!password || password.length < 6) {
			return reply
				.code(400)
				.send({ message: "Password must be at least 6 characters long" });
		}

		try {
			const result = await authService.register(email, username, password);
			return result;
		} catch (err: any) {
			return reply.code(400).send({ message: err.message });
		}
	});

	fastify.post<{ Body: LoginBody }>("/login", async (request, reply) => {
		const { email: rawEmail, password } = request.body;

		const email = rawEmail ? validator.trim(rawEmail) : "";

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

	fastify.post<{ Body: { email?: string } }>(
		"/2fa/setup",
		async (request, reply) => {
			const { email: rawEmail } = request.body;
			const email = rawEmail ? validator.trim(rawEmail) : "";

			if (!email) return reply.code(400).send({ message: "Email required" });

			try {
				const result = await authService.setup2FA(email);
				return result;
			} catch (err: any) {
				return reply.code(400).send({ message: err.message });
			}
		},
	);

	fastify.post<{ Body: TwoFABody }>("/2fa/verify", async (request, reply) => {
		const { email: rawEmail, token: rawToken } = request.body;

		const email = rawEmail ? validator.trim(rawEmail) : "";
		const token = rawToken ? validator.trim(rawToken) : "";

		if (!email || !token)
			return reply.code(400).send({ message: "Email and token required" });
		try {
			const result = await authService.verify2FA(email, token);
			return result;
		} catch (err: any) {
			return reply.code(400).send({ message: err.message });
		}
	});

	fastify.post("/logout", async (request, reply) => {
		try {
			const userId = request.authedUser?.id;
			if (!userId) {
				return reply.code(401).send({ message: "Unauthorized" });
			}
			await authService.logout(userId);
			return reply.code(204).send();
		} catch (error: any) {
			console.error("Logout error:", error);
			return reply.code(500).send({ message: "Internal server error" });
		}
	});
};

export default authRoutes;
