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
		AppDataSource.getRepository(FriendEntity),
	);
	const friendService = new FriendService(friendRepository);

	app.get<{
		Params: { id: string };
	}>("/friend/:id", async (request, reply) => {
		const { id: friendId } = request.params;
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
		try {
			const friend: Friend | null = await friendService.getFriend(
				userId,
				friendId,
			);
			// friendがいない時に404を返すより、何も表示しないことにしました。
			return reply.status(200).send(friend);
		} catch (e: any) {
			if (
				e.message === "すでに申請済みです" ||
				e.message === "自分自身にフレンド申請は送れません。"
			) {
				const friend = await friendService.getFriend(userId, friendId);
			}
			return reply.status(500).send({ error: e.message });
		}
	});

	app.patch<{
		Params: { id: string };
	}>("/friend/:id", async (request, reply) => {
		const { id: friendId } = request.params;
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
		try {
			await friendService.acceptFriend(userId, friendId);
			// friendがいない時に404を返すより、何も表示しないことにしました。
			return reply.status(200).send({ message: "フレンド申請を承認しました" });
		} catch (e: any) {
			if (
				e.message === "すでに申請済みです" ||
				e.message === "自分自身にフレンド申請は送れません。"
			) {
				const friend = await friendService.getFriend(userId, friendId);
			}
			return reply.status(500).send({ error: e.message });
		}
	});

	app.delete<{
		Params: { id: string };
	}>("/friend/:id", async (request, reply) => {
		const { id: friendId } = request.params;
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
		try {
			await friendService.removeFriend(userId, friendId);
			// friendがいない時に404を返すより、何も表示しないことにしました。
			return reply.status(200).send({ message: "フレンドを削除しました" });
		} catch (e: any) {
			if (
				e.message === "すでに申請済みです" ||
				e.message === "自分自身にフレンド申請は送れません。"
			) {
				const friend = await friendService.getFriend(userId, friendId);
			}
			return reply.status(500).send({ error: e.message });
		}
	});

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
			console.log(error)
			return reply.status(500).send({ error: error.message });
		}
	});

	app.get("/friends/pending", async (request, reply) => {
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
			const friend: Friend[] | null =
				await friendService.getFriendPendingList(userId);
			// friendがいない時に404を返すより、何も表示しないことにしました。
			return reply.status(200).send(friend);
		} catch (error: any) {
			console.log(error)
			return reply.status(500).send({ error: error.message });
		}
	});

	app.post<{ Body: { friendId: string } }>(
		"/friends",
		async (request, reply) => {
			const { friendId } = request.body;
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
			try {
				await friendService.sendFriendRequest(userId, friendId);
				return reply
					.status(201)
					.send({ message: "フレンド申請を作成しました" });
			} catch (e: any) {
			console.log(e)

				if (
					e.message === "すでに申請済みです" ||
					e.message === "自分自身にフレンド申請は送れません。"
				) {
					return reply.status(400).send({ error: e.message });
				}
				return reply.status(500).send({ error: e.message });
			}
		},
	);
}
