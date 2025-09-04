import html from "./ui/match.html?raw";
import "./ui/match.css";
import { MatchController } from "./ui/controller";

export function renderMatchPage(params?: { [key: string]: string }) {
	const app = document.getElementById("app");
	if (!app) {
		console.error("アプリケーションのルート要素が見つかりません");
		return;
	}
	app.innerHTML = html;
	
	// マッチコントローラーを初期化して実行
	const matchController = new MatchController(params);
	matchController.render();
}