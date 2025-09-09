import "dotenv/config";

import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyWebSocket from "@fastify/websocket";
import { registerUserRoutes } from "@presentation/route/user/userRoutes.js";
import fastify from "fastify";
import fs from "fs";
import authRoutes from "./route/auth/authRoutes.js";
import { registerFriendRoutes } from "./route/friends/friendRoutes.js";
import { registerMatchRoutes } from "./route/match/matchRoutes.js";
import { registerRoomRoutes } from "./route/room/roomRoutes.js";
import { registerUserChange } from "./route/user/usernameChange.js";
import { registerWSRoutes } from "./websocket/ws.js";

export async function buildServer() {
	if (
		!process.env.JWT_SECRET ||
		!process.env.HTTPS_KEY ||
		!process.env.HTTPS_CERT
	) {
		throw new Error("some SECRET is not set in environment variables");
	}

	const app = fastify({
		logger: {
			level: "info",
		},
		// https: {
		// 	key: fs.readFileSync(process.env.HTTPS_KEY),
		// 	cert: fs.readFileSync(process.env.HTTPS_CERT),
		// },
	});
	// corsの設定
	// await app.register(cors, {
	// 	origin: true,
	// 	methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
	// 	allowedHeaders: ["Content-Type", "Authorization"],
	// });

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
	await app.register(fastifyWebSocket);

	// authのrouting?
	await app.register(authRoutes, { prefix: "/auth" }); // todo : 書き方統一したい

	await registerUserRoutes(app);
	await registerRoomRoutes(app);
	await registerUserChange(app);
	await registerMatchRoutes(app);
	// webSocketのrouting
	await registerWSRoutes(app);
	await registerFriendRoutes(app);
	return app;
}
