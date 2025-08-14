import { HomeModel } from "@pages/home/model/home-model";
import homeHtml from "./ui/home.html?raw";

export async function initHomePage() {
	const homeModel = new HomeModel();
	await homeModel.init();
}

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
