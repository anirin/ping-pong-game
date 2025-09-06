import { renderChangeUsernamePage } from "@pages/change_username/index";
import { renderAuthPage } from "@pages/first_page/index";
// import { renderGamePage } from "@pages/game/index";
import { renderHomePage } from "@pages/home/index";
import { renderLobbyPage } from "@pages/lobby";
import { renderGuestTournamentPage as renderLobbyGuestPage } from "@pages/lobby_guest";
import { renderLoginPage } from "@pages/login/index";
import { renderRegisterPage } from "@pages/register/index";
import { renderRoomPage } from "@pages/room";
import { renderSetupPage } from "@pages/setup/index";
import { renderTournamentPage } from "@pages/tournament";
import { renderGuestTournamentPage } from "@pages/tournament_guest";
import { renderGuestMatchPage } from "@pages/match_guest";
import { isLoggedIn } from "@/app/auth";
import { renderFriendListPage } from "@/pages/friends";
import { renderMatchPage } from "@/pages/match";
import { WebSocketManager } from "@/shared/websocket/WebSocketManager";

let currentCleanup: (() => void) | null = null;

import { renderFriendPendingPage } from "@/pages/friend_pending";
import { renderFriendProfilePage } from "@/pages/friend_profile";
import { renderFriendRequestPage } from "@/pages/friend_request";

interface Route {
	path: string;
	// handler: () => void;
	handler: (params?: {
		[key: string]: string;
	}) => (() => void) | void | Promise<(() => void) | void>;
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
	// {
	// 	path: "/game/:matchId",
	// 	handler: renderGamePage,
	// },
	{
		path: "/tournament/:roomId",
		handler: renderTournamentPage,
	},
	{
		path: "/friends",
		handler: renderFriendListPage,
	},
	{
		path: "/friend/request",
		handler: renderFriendRequestPage,
	},
	{
		path: "/friend/pending",
		handler: renderFriendPendingPage,
	},
	{
		path: "/friend/:id",
		handler: renderFriendProfilePage,
	},
	{
		path: "/rooms/:roomId",
		handler: renderRoomPage,
	},
	{
		path: "/lobby",
		handler: () => {
			if (isLoggedIn()) {
				return renderLobbyPage();
			} else {
				return renderLobbyGuestPage();
			}
		},
	},
	{
		path: "/match/:roomId/:matchId",
		handler: renderMatchPage,
	},
	{
		path: "/tournament_guest",
		handler: renderGuestTournamentPage,
	},
	{
		path: "/match_guest",
		handler: renderGuestMatchPage,
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

	// 現在のページのクリーンアップを実行
	if (currentCleanup) {
		currentCleanup();
		currentCleanup = null;
	}

	const path = window.location.pathname;

	// WebSocket接続のクリーンアップ
	// tournament、match、room以外のページに移動する場合はWebSocketを切断
	const isWebSocketPage =
		path.startsWith("/tournament") ||
		path.startsWith("/match/") ||
		path.startsWith("/rooms/");

	if (!isWebSocketPage) {
		const wsManager = WebSocketManager.getInstance();
		wsManager.clearWsManager();
		console.log("WebSocket接続をクリーンアップしました");
	}

	const match = matchRoute(path);
	if (match) {
		const result = match.route.handler(match.params);
		if (result instanceof Promise) {
			result.then((cleanupFn) => {
				if (typeof cleanupFn === "function") {
					currentCleanup = cleanupFn;
				}
			});
		} else if (typeof result === "function") {
			currentCleanup = result;
		}
	} else {
		console.log("No match found. Redirecting to home.");
		window.history.replaceState({}, "", "/");
		const cleanupFn = renderHomePage();
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
