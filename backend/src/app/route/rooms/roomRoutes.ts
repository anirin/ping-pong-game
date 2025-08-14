import { type FastifyInstance } from 'fastify';
import { RoomService } from '@application/services/rooms/RoomService.js';
import { TypeOrmRoomRepository } from '@infrastructure/repository/rooms/TypeORMRoomRepository.js';
import { AppDataSource } from '@infrastructure/data-source.js';

export async function registerRoomRoutes(app: FastifyInstance) {
  const roomRepository = new TypeOrmRoomRepository(AppDataSource.getRepository('RoomEntity'));
  const roomService = new RoomService(roomRepository);

  // POST /rooms: ルーム作成
  app.post<{ Body: { owner_id: string; mode?: string } }>('/rooms', async (request, reply) => {
    try {
      const { owner_id, mode } = request.body;
      if (!owner_id) {
        return reply.status(400).send({ error: 'room and password are required' });
      }
      const room = await roomService.createRoom(owner_id);
      return reply.status(201).send({
        id: room.id,
        mode: room.mode,
        status: room.status,
        createdAt: room.createdAt,
      });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // GET /rooms/:id: ユーザー取得
  app.get<{ Params: { id: string } }>('/rooms/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const room = await roomService.getRoomById(id);
      if (!room) {
        return reply.status(404).send({ error: 'Room not found' });
      }
      return reply.status(200).send({
        id: room.id,
        mode: room.mode,
        status: room.status,
        createdAt: room.createdAt,
      });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // PATCH /users/:id/status: ステータス更新
  app.patch<{ Params: { id: string }; Body: { status: string } }>('/rooms/:id/status', async (request, reply) => {
    try {
      const { id } = request.params;
      const { status } = request.body;
      if (!status) {
        return reply.status(400).send({ error: 'Status is required' });
      }
      const room = await roomService.updateStatus(id, status);
      if (!room) {
        return reply.status(404).send({ error: 'Rooms not found' });
      }
      return reply.status(200).send({
        id: room.id,
        mode: room.mode,
        status: room.status,
        createdAt: room.createdAt,
      });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
}