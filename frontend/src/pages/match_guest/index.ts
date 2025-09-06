import html from "./ui/match_guest.html?raw";
import "./ui/match_guest.css";
import { GuestMatchController } from "./ui/controller.js";

interface GuestMatchPageState {
	controller: GuestMatchController | null;
	eventListeners: Array<{
		element: EventTarget;
		event: string;
		handler: EventListener;
	}>;
	isDestroyed: boolean;
}

export async function renderGuestMatchPage(params?: { [key: string]: string }) {
	const app = document.getElementById("app");
	if (!app) {
		console.error("アプリケーションのルート要素が見つかりません");
		return;
	}

	const state: GuestMatchPageState = {
		controller: null,
		eventListeners: [],
		isDestroyed: false,
	};

	try {
		app.innerHTML = html;
		state.controller = new GuestMatchController(params);
		await state.controller.render();
		setupEventListeners(state);
		return createCleanupFunction(state);
	} catch (error) {
		console.error("ゲストマッチページの初期化に失敗しました:", error);
		showErrorPage(app, error);
		return createErrorCleanupFunction(state);
	}
}

function setupEventListeners(state: GuestMatchPageState): void {
	const handleBeforeUnload = (event: BeforeUnloadEvent) => {
		if (!state.isDestroyed && state.controller) {
			state.controller.destroy();
		}
		// ページ離脱を防ぐ
		event.preventDefault();
		event.returnValue = "ゲストマッチ中です。本当にページを離れますか？";
		return "ゲストマッチ中です。本当にページを離れますか？";
	};

	const handleVisibilityChange = () => {
		if (document.hidden && !state.isDestroyed) {
			console.log("ゲストマッチページが非表示になりました");
		} else if (!document.hidden && !state.isDestroyed) {
			console.log("ゲストマッチページが表示されました");
		}
	};

	const handlePageHide = () => {
		if (!state.isDestroyed && state.controller) {
			console.log("ページが非表示になりました - リソースを節約");
		}
	};

	// ブラウザの戻るボタンを無効にする
	const handlePopState = (event: Event) => {
		const popStateEvent = event as PopStateEvent;
		popStateEvent.preventDefault();
		popStateEvent.stopImmediatePropagation();

		window.history.pushState(null, "", window.location.href);
		console.log("ゲストマッチ画面での戻る操作を無効化しました");

		alert("ゲストマッチ中は戻る操作はできません");
	};

	// キーボードショートカットを無効にする
	const handleKeyDown = (event: Event) => {
		const keyboardEvent = event as KeyboardEvent;
		if (keyboardEvent.altKey && keyboardEvent.key === "ArrowLeft") {
			keyboardEvent.preventDefault();
			keyboardEvent.stopPropagation();
			console.log("ゲストマッチ画面でのキーボード戻る操作を無効化しました");
			alert("ゲストマッチ中は戻る操作はできません");
		}
		if (keyboardEvent.altKey && keyboardEvent.key === "ArrowRight") {
			keyboardEvent.preventDefault();
			keyboardEvent.stopPropagation();
			console.log("ゲストマッチ画面でのキーボード進む操作を無効化しました");
		}
		if (
			keyboardEvent.key === "Backspace" &&
			!keyboardEvent.ctrlKey &&
			!keyboardEvent.metaKey
		) {
			const target = keyboardEvent.target as HTMLElement;
			if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
				keyboardEvent.preventDefault();
				keyboardEvent.stopPropagation();
				console.log("ゲストマッチ画面でのBackspaceキーを無効化しました");
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
		element.addEventListener(event, handler, true);
		state.eventListeners.push({ element, event, handler });
	});

	// 初期状態をプッシュして戻る操作を無効化
	window.history.pushState(null, "", window.location.href);

	setTimeout(() => {
		window.history.pushState(null, "", window.location.href);
	}, 100);
}

function createCleanupFunction(state: GuestMatchPageState): () => void {
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

			console.log("ゲストマッチページのクリーンアップが完了しました");
		} catch (error) {
			console.error("クリーンアップ中にエラーが発生しました:", error);
		}
	};
}

function createErrorCleanupFunction(state: GuestMatchPageState): () => void {
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
				<p style="margin-bottom: 1rem;">ゲストマッチページの読み込みに失敗しました。</p>
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
					<button onclick="alert('ゲストマッチ画面では戻る操作は無効です')" style="
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
