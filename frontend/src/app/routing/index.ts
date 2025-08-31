import { renderChangeUsernamePage } from "@pages/change_username/index";
import { renderAuthPage } from "@pages/first_page/index";
import { renderGamePage } from "@pages/game/index";
import { renderHomePage } from "@pages/home/index";
import { renderLobbyPage } from "@pages/lobby";
import { renderLoginPage } from "@pages/login/index";
import { renderRegisterPage } from "@pages/register/index";
import { renderRoomPage } from "@pages/room";
import { renderSetupPage } from "@pages/setup/index";
import { renderTournamentPage } from "@pages/tournament";

interface Route {
	path: string;
	// handler: () => void;
	handler: (params?: { [key: string]: string }) => void;
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
		path: "/auth",
		handler: renderAuthPage,
	},
	{
		path: "/auth/register",
		handler: renderRegisterPage,
	},
	{
		path: "/auth/login",
		handler: renderLoginPage,
	},
	{
		path: "/auth/setup",
		handler: renderSetupPage,
	},
	{
		path: "/users/changeusername",
		handler: renderChangeUsernamePage,
	},
	{
		path: "/game/:matchId",
		handler: renderGamePage,
	},
	{
		path: "/tournament", // id が必要かも
		handler: renderTournamentPage,
	},
	{
		path: "/rooms/:roomId",
		handler: renderRoomPage,
	},
	{
		path: "/lobby",
		handler: renderLobbyPage,
	},

	// {
	// 	path: "/online/room/:id",
	// 	handler: renderOnlineRoomPage,
	// },
];

// frontend/src/app/routing/index.ts (matchRoute関数を差し替え)

function matchRoute(
	path: string,
): { route: Route; params: { [key: string]: string } } | null {
	for (const route of routes) {
		const paramNames: string[] = [];
		const regexPath = route.path
			.replace(/:(\w+)/g, (_, paramName) => {
				paramNames.push(paramName);
				return "([^\\/]+)";
			})
			.replace(/\//g, "\\/");

		const regex = new RegExp(`^${regexPath}$`);
		console.log(`Checking route: "${route.path}" -> Regex: ${regex}`);
		const match = path.match(regex);

		if (match) {
			console.log(`✅ SUCCESS: Matched with "${route.path}"`);
			const params: { [key: string]: string } = {};
			for (let i = 0; i < paramNames.length; i++) {
				params[paramNames[i]] = match[i + 1];
			}
			return { route, params };
		}
	}
	console.log(`❌ FAILED: No route matched.`);
	return null;
}

export function navigate(to?: string) {
	// 1. 引数 `to` が指定されていれば、ブラウザの履歴を更新する
	if (to && to !== window.location.pathname) {
		window.history.pushState({}, "", to);
	}

	// 2. 現在のパスを取得して、対応するページを描画する
	const path = window.location.pathname;
	console.log("Navigating to path:", path);

	const match = matchRoute(path);
	console.log("Match result:", match);

	if (match) {
		match.route.handler(match.params);
	} else {
		console.log("No match found. Redirecting to home.");
		window.history.replaceState({}, "", "/");
		renderHomePage();
	}
}

export function setupRouter(): void {
	// イベントリスナーに渡すためのラッパー関数
	const handleNavigationEvent = () => {
		// navigate関数を引数なしで呼び出す
		navigate();
	};

	// 初回ロードとpopstateイベントでルーティングを処理
	// ★ navigateを直接渡すのではなく、ラッパー関数を渡す
	window.addEventListener("popstate", handleNavigationEvent);
	document.addEventListener("DOMContentLoaded", handleNavigationEvent);

	// ナビゲーションリンクのクリックを処理
	document.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		if (target.tagName === "A" && target.classList.contains("nav-link")) {
			e.preventDefault();
			const href = target.getAttribute("href");
			if (href) {
				// ★ ここは引数ありでnavigateを呼び出す
				navigate(href);
			}
		}
	});
}
