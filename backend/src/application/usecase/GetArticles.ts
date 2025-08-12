import { type ArticleRepository } from '../../domain/repository/ArticleRepository.js';
export class GetArticles {
  constructor(private repo: ArticleRepository) {}
  execute() {
    return this.repo.list();
  }
}
