import lobbyHtml from "./lobby.html?raw";
import "./lobby.css";
import { HeaderWidget } from "@widgets/header";
import { SidebarWidget } from "@widgets/sidebar";
import { navigate } from "../../app/routing/index";

async function handleCreateRoom() {
	const token = localStorage.getItem("accessToken");
	if (!token) {
		alert("Please log in first.");
		return;
	}

	try {
		const response = await fetch("https://localhost:8080/rooms", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});

		if (!response.ok) {
			const errorData = await response
				.json()
				.catch(() => ({ message: "Failed to create room." }));
			throw new Error(errorData.message || "An unknown error occurred.");
		}

		const newRoom = await response.json();

		window.history.pushState({}, "", `/rooms/${newRoom.id}`);
		navigate();
	} catch (error) {
		console.error(error);
		if (error instanceof Error) {
			alert(error.message);
		} else {
			alert("An unexpected error occurred.");
		}
	}
}

export function renderLobbyPage() {
	const container = document.getElementById("app");
	if (!container) return;
	container.innerHTML = lobbyHtml;

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

	// イベントリスナーを設定
	const createRoomButton = document.getElementById("create-room-btn");
	if (createRoomButton) {
		createRoomButton.addEventListener("click", handleCreateRoom);
	}

	// TODO: ここで利用可能なルーム一覧を取得して表示するロジックを追加
}
