import { createArticle } from "../../../entities/article/api/articleApi"

export function ArticleCreateForm(onCreated: () => void) {
  const form = document.createElement("form")
  form.className = "space-y-2 p-4 border rounded-2xl bg-white"

  const title = document.createElement("input")
  title.placeholder = "タイトル"
  title.className = "w-full border rounded-xl p-2"

  const body = document.createElement("textarea")
  body.placeholder = "本文"
  body.className = "w-full border rounded-xl p-2 h-24"

  const error = document.createElement("p")
  error.className = "text-red-600 text-sm hidden"

  const submit = document.createElement("button")
  submit.className = "px-4 py-2 rounded-xl bg-black text-white"
  submit.type = "submit"
  submit.textContent = "投稿"

  form.append(title, body, error, submit)

  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    error.classList.add("hidden")
    try {
      if (!title.value.trim()) throw new Error("title is required")
      await createArticle({ title: title.value.trim(), body: body.value })
      title.value = ""
      body.value = ""
      onCreated()
    } catch (err: any) {
      error.textContent = err?.message ?? "failed"
      error.classList.remove("hidden")
    }
  })

  return form
}