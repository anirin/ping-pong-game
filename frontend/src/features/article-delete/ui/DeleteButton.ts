import { deleteArticle } from "../../../entities/article/api/articleApi"

export function DeleteButton(id: string, onDeleted: () => void) {
  const btn = document.createElement("button")
  btn.className = "px-4 py-2 rounded-xl border hover:bg-gray-50"
  btn.textContent = "削除"
  btn.addEventListener("click", async () => {
    await deleteArticle(id)
    onDeleted()
  })
  return btn
}