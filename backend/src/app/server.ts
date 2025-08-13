import fastify from 'fastify';
import cors from '@fastify/cors';
import { registerUserRoutes } from '@api/route/users/userRoutes.js';

export async function buildServer() {
  const app = fastify({ logger: true });
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await registerUserRoutes(app);
  return app;
}