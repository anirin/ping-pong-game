import html from "./ui/tournament.html?raw";
import "./ui/tournament.css";
import { createTournamentController } from "./ui/controller";

interface TournamentPageState {
	controller: ReturnType<typeof createTournamentController> | null;
	eventListeners: Array<{
		element: EventTarget;
		event: string;
		handler: EventListener;
	}>;
	isDestroyed: boolean;
}

export function renderTournamentPage(params?: { [key: string]: string }) {
	const app = document.getElementById("app");
	if (!app) {
		console.error("アプリケーションのルート要素が見つかりません");
		return;
	}

	const state: TournamentPageState = {
		controller: null,
		eventListeners: [],
		isDestroyed: false,
	};

	try {
		app.innerHTML = html;
		state.controller = createTournamentController(params);
		setupEventListeners(state);
		return createCleanupFunction(state);
	} catch (error) {
		console.error("トーナメントページの初期化に失敗しました:", error);
		showErrorPage(app, error);
		return createErrorCleanupFunction(state);
	}
}

function setupEventListeners(state: TournamentPageState): void {
	const handleBeforeUnload = (event: BeforeUnloadEvent) => {
		if (!state.isDestroyed && state.controller) {
			state.controller.destroy();
		}
		// ページ離脱を防ぐ
		event.preventDefault();
		event.returnValue = "トーナメント中です。本当にページを離れますか？";
		return "トーナメント中です。本当にページを離れますか？";
	};

	const handleVisibilityChange = () => {
		if (document.hidden && !state.isDestroyed) {
			console.log("トーナメントページが非表示になりました");
		} else if (!document.hidden && !state.isDestroyed) {
			console.log("トーナメントページが表示されました");
		}
	};

	const handlePageHide = () => {
		if (!state.isDestroyed && state.controller) {
			console.log("ページが非表示になりました - リソースを節約");
		}
	};

	// ブラウザの戻るボタンを無効にする（より強力な方法）
	const handlePopState = (event: Event) => {
		const popStateEvent = event as PopStateEvent;
		// 戻る操作を即座に無効化
		popStateEvent.preventDefault();
		popStateEvent.stopImmediatePropagation();
		
		// 現在のURLをプッシュして戻る操作を無効化
		window.history.pushState(null, "", window.location.href);
		console.log("トーナメント画面での戻る操作を無効化しました");
		
		// 警告を表示
		alert("トーナメント中は戻る操作はできません");
	};

	// キーボードショートカット（Alt+←など）を無効にする
	const handleKeyDown = (event: Event) => {
		const keyboardEvent = event as KeyboardEvent;
		// Alt + 左矢印キー（戻る）を無効化
		if (keyboardEvent.altKey && keyboardEvent.key === "ArrowLeft") {
			keyboardEvent.preventDefault();
			keyboardEvent.stopPropagation();
			console.log("トーナメント画面でのキーボード戻る操作を無効化しました");
			alert("トーナメント中は戻る操作はできません");
		}
		// Alt + 右矢印キー（進む）も無効化
		if (keyboardEvent.altKey && keyboardEvent.key === "ArrowRight") {
			keyboardEvent.preventDefault();
			keyboardEvent.stopPropagation();
			console.log("トーナメント画面でのキーボード進む操作を無効化しました");
		}
		// Backspaceキーも無効化（一部のブラウザで戻る操作に使用される）
		if (keyboardEvent.key === "Backspace" && !keyboardEvent.ctrlKey && !keyboardEvent.metaKey) {
			const target = keyboardEvent.target as HTMLElement;
			if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
				keyboardEvent.preventDefault();
				keyboardEvent.stopPropagation();
				console.log("トーナメント画面でのBackspaceキーを無効化しました");
			}
		}
	};

	const events = [
		{ element: window, event: "beforeunload", handler: handleBeforeUnload },
		{
			element: document,
			event: "visibilitychange",
			handler: handleVisibilityChange,
		},
		{ element: window, event: "pagehide", handler: handlePageHide },
		{ element: window, event: "popstate", handler: handlePopState },
		{ element: document, event: "keydown", handler: handleKeyDown },
	];

	events.forEach(({ element, event, handler }) => {
		element.addEventListener(event, handler, true); // capture phaseで実行
		state.eventListeners.push({ element, event, handler });
	});

	// 初期状態をプッシュして戻る操作を無効化
	window.history.pushState(null, "", window.location.href);
	
	// 追加の履歴エントリを作成して戻る操作を無効化
	setTimeout(() => {
		window.history.pushState(null, "", window.location.href);
	}, 100);
}

function createCleanupFunction(state: TournamentPageState): () => void {
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

			console.log("トーナメントページのクリーンアップが完了しました");
		} catch (error) {
			console.error("クリーンアップ中にエラーが発生しました:", error);
		}
	};
}

function createErrorCleanupFunction(state: TournamentPageState): () => void {
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
				<p style="margin-bottom: 1rem;">トーナメントページの読み込みに失敗しました。</p>
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
					<button onclick="alert('トーナメント画面では戻る操作は無効です')" style="
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
