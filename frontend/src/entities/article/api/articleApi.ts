import { ArticleSchema, CreateArticleInput, type Article } from "../model/types"

const BASE = (window as any).__API_BASE__ ?? "http://localhost:8080"

export async function fetchArticles(): Promise<Article[]> {
  const res = await fetch(`${BASE}/articles`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return (data as unknown[]).map(v => ArticleSchema.parse(v))
}

export async function createArticle(input: CreateArticleInput): Promise<Article> {
  const payload = CreateArticleInput.parse(input)
  const res = await fetch(`${BASE}/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return ArticleSchema.parse(await res.json())
}

export async function deleteArticle(id: string): Promise<void> {
  const res = await fetch(`${BASE}/articles/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}