import fastify from "fastify"
import cors from "@fastify/cors"
import { registerArticleRoutes } from "./routing/articleRoutes.js"

export async function buildServer() {
  const app = fastify({ logger: true })
  await app.register(cors, { 
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
  await registerArticleRoutes(app)
  return app
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8080)
  buildServer().then(app => app.listen({ port, host: "0.0.0.0" }))
}