import "./ui/friend_pending.css";
import "./ui/friend_header.css";
import { HeaderWidget } from "@/widgets/header";
import { SidebarWidget } from "@/widgets/sidebar";
import { mountFriendPending } from "./ui/controller";
import html from "./ui/friend_pending.html?raw";

export function renderFriendPendingPage() {
	const app = document.getElementById("app")!;
	app.innerHTML = html;

	const headerHost = app.querySelector("#header-widget") as HTMLElement;
	HeaderWidget(headerHost);

	const sidebarHost = app.querySelector("#sidebar-widget") as HTMLElement;
	SidebarWidget(sidebarHost);

	//header-widgetにするか悩んだが、フレンドページでしか使わないため共通化する必要はないと考えました。
	const friend_header = app.querySelector("#friend-header") as HTMLElement;
	friend_header.innerHTML = `
		<button id="friend-list">フレンド一覧</button>
		<button id="friend-request">フレンド追加</button>
		<button id="friend-pending">承認待ち</button>
	`;

	const root = app?.querySelector("#friend-pending-body") as HTMLElement;

	mountFriendPending(root, (path) => {
		history.pushState(null, "", path);
		dispatchEvent(new PopStateEvent("popstate"));
	});

	//friend headerのボタン遷移
	document.getElementById("friend-list")?.addEventListener("click", () => {
		if (window.location.pathname !== "/friends") {
			history.pushState(null, "", "/friends");
			dispatchEvent(new PopStateEvent("popstate"));
		}
	});

	document.getElementById("friend-request")?.addEventListener("click", () => {
		if (window.location.pathname !== "/friend/request") {
			history.pushState(null, "", "/friend/request");
			dispatchEvent(new PopStateEvent("popstate"));
		}
	});
	document.getElementById("friend-pending")?.addEventListener("click", () => {
		if (window.location.pathname !== "/friend/pending") {
			history.pushState(null, "", "/friend/pending");
			dispatchEvent(new PopStateEvent("popstate"));
		}
	});
}
