import lobbyHtml from "./lobby.html?raw";
import "./lobby.css";
import { HeaderWidget } from "@widgets/header";
import { SidebarWidget } from "@widgets/sidebar";
import { navigate } from "../../app/routing/index";

const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

async function handleCreateRoom() {
	const token = localStorage.getItem("accessToken");
	if (!token) {
		alert("Please log in first.");
		return;
	}

	try {
		const response = await fetch(`${VITE_BASE_URL}/rooms`, {
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

function handleJoinRoom() {
	const roomIdInput = document.getElementById(
		"room-id-input",
	) as HTMLInputElement;
	if (!roomIdInput) return;

	const roomId = roomIdInput.value.trim(); // .trim()で前後の空白を削除

	if (!roomId) {
		alert("Please enter a Room ID.");
		return;
	}

	// 入力されたIDのルームページに遷移
	navigate(`/rooms/${roomId}`);
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

	const joinRoomButton = document.getElementById("join-room-btn");
	if (joinRoomButton) {
		joinRoomButton.addEventListener("click", handleJoinRoom);
	}

	// EnterキーでもJoinできるようにする
	const roomIdInput = document.getElementById("room-id-input");
	if (roomIdInput) {
		roomIdInput.addEventListener("keypress", (event) => {
			if (event.key === "Enter") {
				handleJoinRoom();
			}
		});
	}

	// TODO: ここで利用可能なルーム一覧を取得して表示するロジックを追加
}
