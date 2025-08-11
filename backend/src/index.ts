import fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import path from 'path'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const server : FastifyInstance = fastify()

// CORS対策 全てのオリジンからのリクエストを許可
server.register(cors, {
  origin: '*',
})

// 静的ファイルの配信
server.register(staticPlugin, {
  root: path.join(__dirname, 'public'),
})


// Todo型
type Todo = {
	id: number
	text: string
	completed: boolean
}

let todos: Todo[] = [
	{ id: 1, text: '野球をする', completed: false },
	{ id: 2, text: 'ゲームをする', completed: false },
	{ id: 3, text: '仕事をする', completed: false },
]

// GET /todos の型付きルート
server.get<{
	Reply: { todos: Todo[] }
}>('/todos', async (_req, reply) => {
	return reply.send({ todos })
})

// サーバーの起動
server.listen({ port: 8080, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})