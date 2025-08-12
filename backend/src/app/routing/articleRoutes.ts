import { type FastifyInstance } from "fastify"
import { ArticleRepositoryMemory } from "../../infrastructure/repository/ArticleRepositoryMemory.js"
import { GetArticles } from "../../application/usecase/GetArticles.js"
import { CreateArticle } from "../../application/usecase/CreateArticle.js"
import { DeleteArticle } from "../../application/usecase/DeleteArticle.js"
import { ArticleController } from "../controller/ArticleController.js"

export async function registerArticleRoutes(server: FastifyInstance) {
  const repo = new ArticleRepositoryMemory()
  const controller = new ArticleController(
    new GetArticles(repo),
    new CreateArticle(repo),
    new DeleteArticle(repo)
  )
  controller.register(server)
}