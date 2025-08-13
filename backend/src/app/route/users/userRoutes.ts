import { type FastifyInstance } from 'fastify';
import { UserService } from '@application/services/users/UserService.js';
import { TypeOrmUserRepository } from '@infrastructure/repository/users/TypeORMUserRepository.js';
import { AppDataSource } from '@infrastructure/data-source.js';

export async function registerUserRoutes(app: FastifyInstance) {
  const userRepository = new TypeOrmUserRepository(AppDataSource.getRepository('UserEntity'));
  const userService = new UserService(userRepository);

  // POST /users: ユーザー登録
  app.post<{ Body: { username: string; password: string } }>('/users', async (request, reply) => {
    try {
      const { username, password } = request.body;
      if (!username || !password) {
        return reply.status(400).send({ error: 'Username and password are required' });
      }
      const user = await userService.createUser(username, password);
      return reply.status(201).send({
        id: user.id,
        username: user.username.value,
        status: user.status,
        createdAt: user.createdAt,
        avatar: user.avatar?.value ?? null,
      });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // GET /users/:id: ユーザー取得
  app.get<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const user = await userService.getUserById(id);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
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
  });

  // PATCH /users/:id/status: ステータス更新
  app.patch<{ Params: { id: string }; Body: { status: string } }>('/users/:id/status', async (request, reply) => {
    try {
      const { id } = request.params;
      const { status } = request.body;
      if (!status) {
        return reply.status(400).send({ error: 'Status is required' });
      }
      const user = await userService.updateStatus(id, status);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
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
  });
}