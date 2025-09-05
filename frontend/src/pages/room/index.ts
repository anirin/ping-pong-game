import roomHtml from "./ui/room.html?raw";
import "./ui/room.css";
import { HeaderWidget } from "@widgets/header";
import { SidebarWidget } from "@widgets/sidebar";
import { createRoomController } from "./ui/controller";

// グローバルなクリーンアップ関数の参照
let roomController: ReturnType<typeof createRoomController> | null = null;

// クリーンアップ関数
function cleanupRoomPage() {
	if (roomController) {
		roomController.destroy();
		roomController = null;
	}
	console.log("ルームページのクリーンアップ完了");
}

// ページ離脱時のイベントリスナーを追加
window.addEventListener("beforeunload", cleanupRoomPage);
window.addEventListener("pagehide", cleanupRoomPage);

// --- メイン関数 ---
export function renderRoomPage(params?: { [key: string]: string }) {
	const container = document.getElementById("app");
	if (!container) return;
	
	// 既存のコントローラーがあれば破棄
	if (roomController) {
		roomController.destroy();
	}

	container.innerHTML = roomHtml;

	// Header widgetを初期化
	const headerHost = container.querySelector("#header-widget") as HTMLElement;
	if (headerHost) {
		HeaderWidget(headerHost);
	}

	// Sidebar widgetを初期化
	const sidebarHost = container.querySelector("#sidebar-widget") as HTMLElement;
	if (sidebarHost) {
		SidebarWidget(sidebarHost);
	}

	// RoomControllerを作成して初期化
	roomController = createRoomController(params);
	roomController.render().catch((error) => {
		console.error("Failed to initialize room controller:", error);
	});

	return cleanupRoomPage;
}
