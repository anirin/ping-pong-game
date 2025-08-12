import type { ArticleRepository } from "../../domain/repository/ArticleRepository.js"
export class DeleteArticle {
  constructor(private repo: ArticleRepository) {}
  execute(id: string) {
    if (!id) throw new Error("id is required")
    return this.repo.delete(id)
  }
}