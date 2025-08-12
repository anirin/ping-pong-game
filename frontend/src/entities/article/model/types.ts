import { z } from "zod"

export const ArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string()
})

export type Article = z.infer<typeof ArticleSchema>

export const CreateArticleInput = z.object({
  title: z.string().min(1),
  body: z.string().optional().default("")
})
export type CreateArticleInput = z.infer<typeof CreateArticleInput>