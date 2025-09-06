import "./ui/profile.css";
import { HeaderWidget } from "@/widgets/header";
import { SidebarWidget } from "@/widgets/sidebar";
import { mountProfile } from "./ui/controller";
import html from "./ui/profile.html?raw";

export function renderProfilePage() {
	const app = document.getElementById("app")!;
	app.innerHTML = html;

	const headerHost = app?.querySelector("#header-widget") as HTMLElement;
	HeaderWidget(headerHost);

	const sidebarHost = app?.querySelector("#sidebar-widget") as HTMLElement;
	SidebarWidget(sidebarHost);

	const root = app?.querySelector("#profile-list-body") as HTMLElement;

	mountProfile(root, (path) => {
		history.pushState(null, "", path);
		dispatchEvent(new PopStateEvent("popstate"));
	});
}
