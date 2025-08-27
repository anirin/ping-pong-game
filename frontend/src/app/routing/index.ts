import { renderChangeUsernamePage } from "@pages/change_username/index";
import { renderAuthPage } from "@pages/first_page/index";
import { renderHomePage } from "@pages/home/index";
import { renderLoginPage } from "@pages/login/index";
import { renderRegisterPage } from "@pages/register/index";
import { renderRoomEntrancePage } from "@pages/room-entrance/index";
import { renderSetupPage } from "@pages/setup/index";
import { renderGamePage } from "@pages/game/index";

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
	{
		path: "/game/:matchId",
		handler: renderGamePage,
	},

	// {
	// 	path: "/online/room/:id",
	// 	handler: renderOnlineRoomPage,
	// },
];

function matchRoute(path: string): { route: Route; params: { [key: string]: string } } | null {
    for (const route of routes) {
        const routeParts = route.path.split('/').filter(p => p);
        const pathParts = path.split('/').filter(p => p);

        if (routeParts.length !== pathParts.length) {
            continue;
        }

        const params: { [key: string]: string } = {};
        let isMatch = true;

        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const pathPart = pathParts[i];

            if (routePart.startsWith(':')) {
                const paramName = routePart.substring(1);
                params[paramName] = pathPart; 
            } else if (routePart !== pathPart) {
                isMatch = false;
                break;
            }
        }
        if (isMatch) {
            return { route, params };
        }
    }
    return null;
}


export function setupRouter(): void {
	const navigate = () => {

		const path = window.location.pathname;
		const match = matchRoute(path);

		if (match) {
            // マッチしたハンドラに、抽出したパラメータを渡す
			match.route.handler(match.params);
		} else {
			window.history.replaceState({}, "", "/");
			renderHomePage();
		}
		
	};
    // ... (以

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
