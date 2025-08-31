import "./ui/friend_list.css";
import "./ui/friend_header.css";
import { HeaderWidget } from "@/widgets/header";
import { SidebarWidget } from "@/widgets/sidebar";
import { mountFriendProfile } from "./ui/controller";
import html from "./ui/friend_list.html?raw";

export function renderFriendListPage() {
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
		<button id="friend-add">フレンド追加</button>
	`;

	const root = app?.querySelector("#friend-list-body") as HTMLElement;

	mountFriendProfile(root, (path) => {
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

	document.getElementById("friend-add")?.addEventListener("click", () => {
		if (window.location.pathname !== "/friend/add") {
			history.pushState(null, "", "/friend/add");
			dispatchEvent(new PopStateEvent("popstate"));
		}
	});
}
