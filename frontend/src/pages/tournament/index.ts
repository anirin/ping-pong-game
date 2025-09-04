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
		// HTMLを設定
		app.innerHTML = html;

		// トーナメントコントローラーを初期化
		const tournamentController = createTournamentController();
		
		// ページを離れる際のクリーンアップを設定
		const handleBeforeUnload = () => {
			tournamentController.destroy();
		};

		// ページの可視性が変更された時のクリーンアップも設定
		const handleVisibilityChange = () => {
			if (document.hidden) {
				// ページが非表示になった時の処理（必要に応じて）
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		document.addEventListener('visibilitychange', handleVisibilityChange);

		// クリーンアップ関数を返す（必要に応じて外部から呼び出し可能）
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
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
