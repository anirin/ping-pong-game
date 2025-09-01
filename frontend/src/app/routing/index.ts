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

let currentCleanup: (() => void) | null = null;

interface Route {
	path: string;
	// handler: () => void;
	handler: (params?: { [key: string]: string }) => (() => void) | void;
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
];

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
			const params: { [key: string]: string } = {};
			for (let i = 0; i < paramNames.length; i++) {
				params[paramNames[i]] = match[i + 1];
			}
			return { route, params };
		}
	}
	return null;
}

export function navigate(to?: string) {
	if (to && to !== window.location.pathname) {
		window.history.pushState({}, "", to);
	}
	if (currentCleanup) {
		currentCleanup();
		currentCleanup = null;
	}

	const path = window.location.pathname;
	console.log("Navigating to path:", path);

	const match = matchRoute(path);
	console.log("Match result:", match);

	if (match) {
		const cleanupFn = match.route.handler(match.params);
		if (typeof cleanupFn === "function") {
			currentCleanup = cleanupFn;
		}
	} else {
		console.log("No match found. Redirecting to home.");
		window.history.replaceState({}, "", "/");
		const cleanupFn = renderHomePage(); // ホームページもクリーンアップ関数を返す可能性がある
		if (typeof cleanupFn === "function") {
			currentCleanup = cleanupFn;
		}
	}
}

export function setupRouter(): void {
	const handleNavigationEvent = () => navigate();

	window.addEventListener("popstate", handleNavigationEvent);
	document.addEventListener("DOMContentLoaded", handleNavigationEvent);

	document.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		if (target.tagName === "A" && target.classList.contains("nav-link")) {
			e.preventDefault();
			const href = target.getAttribute("href");
			if (href) {
				navigate(href);
			}
		}
	});
}
