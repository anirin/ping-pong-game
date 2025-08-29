import html from "./ui/tournament.html?raw";
import "./ui/tournament.css";
import { TournamentWebSocketAPI } from "./api/api.js";
import { TournamentModel } from "./model/model.js";
import { TournamentController } from "./ui/controller.js";

export function renderTournamentPage() {
	const app = document.getElementById("app")!;
	app.innerHTML = html;

	// 依存関係の構築: API → Model → Controller
	const api = new TournamentWebSocketAPI();
	const model = new TournamentModel(api);
	const controller = new TournamentController(model);
}
