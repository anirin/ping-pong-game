import type { ArticleRepository } from "../../domain/repository/ArticleRepository.js"
export class CreateArticle {
  constructor(private repo: ArticleRepository) {}
  execute(input: { title: string; body?: string }) {
    if (!input.title?.trim()) throw new Error("title is required")
    return this.repo.create({ title: input.title.trim(), body: input.body ?? "" })
  }
}