import { FriendService } from "@application/services/friends/FriendService.js";
import type { Friend } from "@domain/model/entity/friend/Friend.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { FriendEntity } from "@infrastructure/entity/friend/FriendEntity.js";
import { TypeOrmFriendRepository } from "@infrastructure/repository/friends/TypeOrmFriendRepository.js";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

//GET friends friendList取得
export async function registerFriendRoutes(app: FastifyInstance) {
	const friendRepository = new TypeOrmFriendRepository(
		AppDataSource.getRepository("FriendEntity"),
	);
	const friendService = new FriendService(friendRepository);

	app.get("/friends", async (request, reply) => {
		try {
			const authHeader = request.headers["authorization"];

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.status(401).send({ error: "Token required" });
			}

			const token = authHeader.split(" ")[1]!;
			let userId: string;
			const payload = jwt.verify(token, JWT_SECRET) as { id: string };
			userId = payload.id || "";
			if (!userId) {
				return reply.status(403).send({ error: "Invalid Token" });
			}
			const friend: Friend[] | null = await friendService.getFriendList(userId);
			// friendがいない時に404を返すより、何も表示しないことにしました。
			return reply.status(200).send(friend);
		} catch (error: any) {
			return reply.status(500).send({ error: error.message });
		}
	});
}
