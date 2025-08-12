import { type Article, type ArticleId } from '../../domain/models/Article.js';
import { type ArticleRepository } from '../../domain/repository/ArticleRepository.js';
import { randomUUID } from 'node:crypto';

export class ArticleRepositoryMemory implements ArticleRepository {
  private store: Map<ArticleId, Article> = new Map();

  async list(): Promise<Article[]> {
    return Array.from(this.store.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async create(input: { title: string; body: string }): Promise<Article> {
    const article: Article = {
      id: randomUUID(),
      title: input.title,
      body: input.body,
      createdAt: new Date(),
    };
    this.store.set(article.id, article);
    return article;
  }

  async delete(id: ArticleId): Promise<void> {
    this.store.delete(id);
  }
}
