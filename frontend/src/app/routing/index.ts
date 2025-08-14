import { initHomePage } from "@pages/home/index";
import homeHtml from "@pages/home/ui/home.html?raw";

interface Route {
	path: string;
	handler: () => void;
}

const routes: Route[] = [
	{
		path: "/",
		handler: renderHomePage,
	},
	{
		path: "/home",
		handler: renderHomePage,
	},
	{
		path: "/room",
		handler: renderRoomPage,
	},
];

export function setupRouter(): void {
	const navigate = () => {
		const path = window.location.pathname;
		const route = routes.find((r) => r.path === path);

		if (route) {
			route.handler();
		} else {
			// パスが見つからない場合はホームページにリダイレクト
			window.history.replaceState({}, "", "/");
			renderHomePage();
		}
	};

	// 初回ロードとpopstateイベントでルーティングを処理
	window.addEventListener("popstate", navigate);
	document.addEventListener("DOMContentLoaded", navigate);

	// ナビゲーションリンクのクリックを処理
	document.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		if (target.tagName === "A" && target.classList.contains("nav-link")) {
			e.preventDefault();
			const href = target.getAttribute("href");
			if (href) {
				window.history.pushState({}, "", href);
				navigate();
			}
		}
	});
}

// ページのレンダリング関数
export function renderHomePage(): void {
	console.log("renderHomePage");

	const appContainer = document.getElementById("app");
	console.log("appContainer", appContainer);
	if (appContainer) {
		appContainer.innerHTML = homeHtml;
		// ページのスクリプトを再初期化
		initHomePage();
		console.log("initHomePage");
	} else {
		console.log("appContainer not found");
	}
}

export function renderRoomPage(): void {
	// ルームページは未実装のためプレースホルダー
	const appContainer = document.getElementById("app");
	if (appContainer) {
		appContainer.innerHTML = "<h1>ルーム画面（未実装）</h1>";
	}
}
