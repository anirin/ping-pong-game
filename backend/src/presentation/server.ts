import { registerUserRoutes } from "@presentation/route/users/userRoutes.js";
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

	if (!process.env.JWT_SECRET) {
		throw new Error("JWT_SECRET is not set in environment variables");
	}

	await app.register(fastifyJwt, {
		secret: process.env.JWT_SECRET as string,
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
	await app.register(authRoutes, { prefix: "/auth" });

	return app;
}
