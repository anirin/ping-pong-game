import { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify"
import { GetArticles } from "../../application/usecase/GetArticles.js"
import { CreateArticle } from "../../application/usecase/CreateArticle.js"
import { DeleteArticle } from "../../application/usecase/DeleteArticle.js"

export class ArticleController {
  constructor(
    private getArticles: GetArticles,
    private createArticle: CreateArticle,
    private deleteArticle: DeleteArticle
  ) {}

  register(server: FastifyInstance) {
    server.get("/articles", async (_req, reply) => {
      const data = await this.getArticles.execute()
      return reply.code(200).send(data)
    })

    server.post<{
      Body: { title: string; body?: string }
    }>("/articles", async (req, reply) => {
      const created = await this.createArticle.execute(req.body)
      return reply.code(201).send(created)
    })

    server.delete<{ Params: { id: string } }>("/articles/:id", async (req, reply) => {
      await this.deleteArticle.execute(req.params.id)
      return reply.code(204).send()
    })
  }
}
