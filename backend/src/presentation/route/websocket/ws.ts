import type { FastifyInstance } from "fastify";


export async function registerWebSocket(app: FastifyInstance) {
  app.get("/wss")
}