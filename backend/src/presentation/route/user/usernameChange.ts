import { UserService } from "@application/services/users/UserService.js";
import { AppDataSource } from "@infrastructure/data-source.js";
import { TypeOrmUserRepository } from "@infrastructure/repository/users/TypeORMUserRepository.js";
import type { FastifyInstance } from "fastify";

export async function registerUserChange(app: FastifyInstance) {
	const userRepository = new TypeOrmUserRepository(
		AppDataSource.getRepository("UserEntity"),
	);
	const userService = new UserService(userRepository);

	// PATCH /users/:id/username: ユーザー名変更
	app.patch<{ Params: { id: string }; Body: { username: string } }>(
		"/api/users/:id/username",
		async (request, reply) => {
			try {
				const { id } = request.params;
				const { username } = request.body;

				if (!username) {
					return reply.status(400).send({ error: "Username is required" });
				}

				const user = await userService.updateUsername(id, username);
				if (!user) {
					return reply.status(404).send({ error: "User not found" });
				}

				return reply.status(200).send({
					id: user.id,
					username: user.username.value,
					status: user.status,
					createdAt: user.createdAt,
					avatar: user.avatar?.value ?? null,
				});
			} catch (error: any) {
				if (
					error.code === "SQLITE_CONSTRAINT" &&
					error.message.includes("users.username")
				)
					return reply
						.status(409)
						.send({ error: "This username is already in use" });
			}
		},
	);

	// PATCH /users/:id/avatar: アバター更新
	app.patch<{ Params: { id: string }; Body: { avatar: string } }>(
		"/api/users/:id/avatar",
		async (request, reply) => {
			try {
				const { id } = request.params;
				const { avatar } = request.body;

				if (!avatar) {
					return reply.status(400).send({ error: "Avatar is required" });
				}

				const user = await userService.updateAvatar(id, avatar);
				if (!user) {
					return reply.status(404).send({ error: "User not found" });
				}

				return reply.status(200).send({
					id: user.id,
					username: user.username.value,
					status: user.status,
					createdAt: user.createdAt,
					avatar: user.avatar?.value ?? null,
				});
			} catch (error: any) {
				return reply.status(500).send({ error: error.message });
			}
		},
	);
}
