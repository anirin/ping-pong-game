type Todo = {
    id: number
    text: string
    completed: boolean
  }
  
  type TodosResponse = {
    todos: Todo[]
  }
  
  // 型安全な要素取得
  const $ = <T extends Element>(selector: string) => {
    const el = document.querySelector(selector)
    if (!el) throw new Error(`missing element: ${selector}`)
    return el as T
  }
  
  const todoList = $("#todo-list") as HTMLUListElement
  const todoItemTemplate = $("#todo-item-template") as HTMLTemplateElement
  const reloadButton = $("#reload") as HTMLButtonElement
  
  function renderTodos(todos: Todo[]) {
    todoList.innerHTML = ""
    for (const todo of todos) {
      const frag = document.importNode(todoItemTemplate.content, true)
      const textEl = frag.querySelector(".todo-text") as HTMLSpanElement
      const toggle = frag.querySelector(".toggle-completed") as HTMLInputElement
  
      textEl.textContent = todo.text
      toggle.checked = todo.completed
      if (todo.completed) textEl.classList.add("done")
  
      // サーバー更新はしない。見た目だけローカルでトグル
      toggle.addEventListener("change", () => {
        const done = toggle.checked
        textEl.classList.toggle("done", done)
      })
  
      todoList.appendChild(frag)
    }
  }
  
  async function fetchTodos() {
    const res = await fetch("http://localhost:8080/todos", {
      headers: { Accept: "application/json" },
    })
    if (!res.ok) {
      throw new Error(`GET /todos failed: ${res.status} ${res.statusText}`)
    }
  
    const data = (await res.json()) as unknown
    // 最低限の型ガード
    if (
      !data ||
      typeof data !== "object" ||
      !("todos" in data) ||
      !Array.isArray((data as any).todos)
    ) {
      throw new Error("Invalid response shape")
    }
  
    const { todos } = data as TodosResponse
    renderTodos(todos)
  }
  
  reloadButton.addEventListener("click", () => {
    fetchTodos().catch((e) => {
      console.error(e)
      alert("TODOの取得に失敗しました")
    })
  })
  
  // 初回ロード
//   fetchTodos().catch((e) => {
//     console.error(e)
//     alert("TODOの取得に失敗しました")
//   })
  