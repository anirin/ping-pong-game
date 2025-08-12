import { mountRouter } from "./routing"

declare global {
  interface Window { __API_BASE__?: string }
}

window.__API_BASE__ = "http://localhost:5173"

const app = document.getElementById("app")!
mountRouter(app)