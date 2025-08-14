import { registerUserRoutes } from "@api/route/users/userRoutes.js";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastify from "fastify";
import authRoutes from "./route/auth/authRoutes.js";
import { registerRoomRoutes } from "./route/rooms/roomRoutes.js";

export async function buildServer() {
	const app = fastify({ logger: true });

	await app.register(cors, {
		origin: true,
		methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
	});

	await app.register(fastifyJwt, {
		secret: process.env.JWT_SECRET || "fallback_secret",
	});

	app.decorate("authenticate", async (request: any, reply: any) => {
		try {
			await request.jwtVerify();
		} catch (err) {
			reply.send(err);
		}
	});

	await registerUserRoutes(app);
	await registerRoomRoutes(app);
	await app.register(authRoutes, { prefix: "/auth" }); // ← 追加（プレフィックス任意）

	return app;
}
