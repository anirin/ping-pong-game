// エンティティ
export type ArticleId = string

export interface Article {
  id: ArticleId
  title: string
  body: string
  createdAt: Date
}