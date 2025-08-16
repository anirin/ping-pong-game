import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import { registerUserRoutes } from "@presentation/route/user/userRoutes.js";
import fastify from "fastify";
import authRoutes from "./route/auth/authRoutes.js";
import { registerRoomRoutes } from "./route/room/roomRoutes.js";
import fastifyWebSocket from "@fastify/websocket";

export async function buildServer() {
	if (!process.env.JWT_SECRET) {
		throw new Error("JWT_SECRET is not set in environment variables");
	}

	const app = fastify({ logger: true });

	// corsの設定
	await app.register(cors, {
		origin: true,
		methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	});

	// jwtの設定
	await app.register(fastifyJwt, {
		secret: process.env.JWT_SECRET as string,
	});

	// jwtのデコレーター
	app.decorate("authenticate", async (request: any, reply: any) => {
		try {
			await request.jwtVerify();
		} catch (err) {
			reply.send(err);
		}
	});

	// webSocketの設定
	await app.register(fastifyWebSocket, {
		prefix: "/ws",
	});

	await registerUserRoutes(app);
	await registerRoomRoutes(app);
	await registerTournamentRoutes(app);
	await app.register(authRoutes, { prefix: "/auth" });

	return app;
}
