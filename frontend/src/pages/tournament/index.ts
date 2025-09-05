import html from "./ui/tournament.html?raw";
import "./ui/tournament.css";
import { createTournamentController } from "./ui/controller";

export function renderTournamentPage() {
	const app = document.getElementById("app");
	if (!app) {
		console.error("アプリケーションのルート要素が見つかりません");
		return;
	}

	try {
		app.innerHTML = html;
		const tournamentController = createTournamentController();

		const handleBeforeUnload = () => {
			tournamentController.destroy();
		};

		const handleVisibilityChange = () => {
			if (document.hidden) {
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			tournamentController.destroy();
		};
	} catch (error) {
		console.error("トーナメントページの初期化に失敗しました:", error);
		app.innerHTML = `
			<div class="error-container">
				<h2>エラーが発生しました</h2>
				<p>トーナメントページの読み込みに失敗しました。</p>
				<button onclick="location.reload()">再読み込み</button>
			</div>
		`;
	}
}
