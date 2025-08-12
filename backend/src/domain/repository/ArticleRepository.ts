import { type Article, type ArticleId } from '../models/Article.js'

export interface ArticleRepository {
  list(): Promise<Article[]>
  create(input: Omit<Article, "id" | "createdAt">): Promise<Article>
  delete(id: ArticleId): Promise<void>
}