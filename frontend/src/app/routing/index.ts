import { renderChangeUsernamePage } from "@pages/change_username/index";
import { renderAuthPage } from "@pages/first_page/index";
import { renderHomePage } from "@pages/home/index";
import { renderLoginPage } from "@pages/login/index";
import { renderRegisterPage } from "@pages/register/index";
import { renderRoomEntrancePage } from "@pages/room-entrance/index";
import { renderSetupPage } from "@pages/setup/index";

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
		path: "/room/entrance",
		handler: renderRoomEntrancePage,
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
	// 	path: "/online/room/:id",
	// 	handler: renderOnlineRoomPage,
	// },
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
