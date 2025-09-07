import html from "./ui/tournament_guest.html?raw";
import "./ui/tournament_guest.css";
import { createGuestTournamentController } from "./ui/controller.js";

interface GuestTournamentPageState {
	controller: ReturnType<typeof createGuestTournamentController> | null;
	eventListeners: Array<{
		element: EventTarget;
		event: string;
		handler: EventListener;
	}>;
	isDestroyed: boolean;
}

export function renderGuestTournamentPage(params?: { [key: string]: string }) {
	const app = document.getElementById("app");
	if (!app) {
		console.error("アプリケーションのルート要素が見つかりません");
		return;
	}

	const state: GuestTournamentPageState = {
		controller: null,
		eventListeners: [],
		isDestroyed: false,
	};

	try {
		app.innerHTML = html;
		state.controller = createGuestTournamentController(params);
		setupEventListeners(state);
		return createCleanupFunction(state);
	} catch (error) {
		console.error("ゲストトーナメントページの初期化に失敗しました:", error);
		showErrorPage(app, error);
		return createErrorCleanupFunction(state);
	}
}

function setupEventListeners(state: GuestTournamentPageState): void {
	const handleBeforeUnload = (_event: BeforeUnloadEvent) => {
		if (!state.isDestroyed && state.controller) {
			state.controller.destroy();
		}
		// ゲストページではページ離脱を許可
	};

	const handleVisibilityChange = () => {
		if (document.hidden && !state.isDestroyed) {
			console.log("ゲストトーナメントページが非表示になりました");
		} else if (!document.hidden && !state.isDestroyed) {
			console.log("ゲストトーナメントページが表示されました");
		}
	};

	const handlePageHide = () => {
		if (!state.isDestroyed && state.controller) {
			console.log("ページが非表示になりました - リソースを節約");
		}
	};

	// ゲストページでは戻るボタンを許可
	const events = [
		{ element: window, event: "beforeunload", handler: handleBeforeUnload },
		{
			element: document,
			event: "visibilitychange",
			handler: handleVisibilityChange,
		},
		{ element: window, event: "pagehide", handler: handlePageHide },
	];

	events.forEach(({ element, event, handler }) => {
		element.addEventListener(event, handler, true);
		state.eventListeners.push({ element, event, handler });
	});
}

function createCleanupFunction(state: GuestTournamentPageState): () => void {
	return () => {
		if (state.isDestroyed) {
			return;
		}

		state.isDestroyed = true;

		try {
			state.eventListeners.forEach(({ element, event, handler }) => {
				element.removeEventListener(event, handler);
			});
			state.eventListeners = [];

			if (state.controller) {
				state.controller.destroy();
				state.controller = null;
			}

			// ゲストページでは履歴修正は不要

			console.log("ゲストトーナメントページのクリーンアップが完了しました");
		} catch (error) {
			console.error("クリーンアップ中にエラーが発生しました:", error);
		}
	};
}

function createErrorCleanupFunction(
	state: GuestTournamentPageState,
): () => void {
	return () => {
		if (state.isDestroyed) {
			return;
		}

		state.isDestroyed = true;

		try {
			state.eventListeners.forEach(({ element, event, handler }) => {
				element.removeEventListener(event, handler);
			});
			state.eventListeners = [];
		} catch (error) {
			console.error("エラー状態でのクリーンアップ中にエラーが発生:", error);
		}
	};
}

function showErrorPage(app: HTMLElement, error: unknown): void {
	const errorMessage =
		error instanceof Error ? error.message : "不明なエラーが発生しました";

	app.innerHTML = `
		<div class="error-container" style="
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			height: 100vh;
			text-align: center;
			padding: 2rem;
			background: #f8f9fa;
		">
			<div style="
				background: white;
				padding: 2rem;
				border-radius: 10px;
				box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
				max-width: 500px;
			">
				<h2 style="color: #dc3545; margin-bottom: 1rem;">⚠️ エラーが発生しました</h2>
				<p style="margin-bottom: 1rem;">ゲストトーナメントページの読み込みに失敗しました。</p>
				<details style="margin-bottom: 1rem; text-align: left;">
					<summary style="cursor: pointer; color: #6c757d;">エラー詳細</summary>
					<pre style="
						background: #f8f9fa;
						padding: 1rem;
						border-radius: 5px;
						font-size: 0.9rem;
						overflow-x: auto;
						margin-top: 0.5rem;
					">${errorMessage}</pre>
				</details>
				<div style="display: flex; gap: 1rem; justify-content: center;">
					<button onclick="location.reload()" style="
						background: #007bff;
						color: white;
						border: none;
						padding: 0.75rem 1.5rem;
						border-radius: 5px;
						cursor: pointer;
						font-size: 1rem;
					">再読み込み</button>
					<button onclick="alert('ゲストトーナメント画面では戻る操作は無効です')" style="
						background: #6c757d;
						color: white;
						border: none;
						padding: 0.75rem 1.5rem;
						border-radius: 5px;
						cursor: pointer;
						font-size: 1rem;
					">戻る（無効）</button>
				</div>
			</div>
		</div>
	`;
}
