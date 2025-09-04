import html from "./ui/tournament.html?raw";
import "./ui/tournament.css";
import { createTournamentController } from "./ui/controller";

export function renderTournamentPage() {
	const app = document.getElementById("app")!;
	app.innerHTML = html;

	// トーナメントコントローラーを初期化（既存のWebSocket接続を使用）
	const tournamentController = createTournamentController();
	
	// ページを離れる際のクリーンアップを設定
	window.addEventListener('beforeunload', () => {
		tournamentController.destroy();
	});
}
