import roomHtml from "./room.html?raw";
import "./room.css";
import { HeaderWidget } from "@widgets/header";
import { SidebarWidget } from "@widgets/sidebar";
import type { RoomUser } from "../../types/types"; // パスはあなたのプロジェクトに合わせてください
import type { WSIncomingMsg, WSOutgoingMsg } from "../../types/ws-types"; // パスはあなたのプロジェクトに合わせてください

// --- グローバル状態管理 ---
const state = {
	myUserId: null as string | null,
	roomInfo: null as any | null,
	participants: [] as RoomUser[],
	isOwner: false,
	isWsConnected: false,
};

let websocket: WebSocket | null = null;

// --- ヘルパー関数 ---
function decodeJwt(token: string): any {
	try {
		const base64Url = token.split(".")[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
				.join(""),
		);
		return JSON.parse(jsonPayload);
	} catch (e) {
		return null;
	}
}

// --- DOM操作 ---
function renderParticipantsList() {
	const listElement = document.getElementById("participants-list");
	if (!listElement) return;

	listElement.innerHTML = "";

	if (state.participants.length === 0) {
		listElement.innerHTML =
			'<li class="participant-item-empty">Waiting for other players...</li>';
		return;
	}

	state.participants.forEach((user) => {
		const li = document.createElement("li");
		li.className = "participant-item";

		// --- ▼▼▼ ここが最重要修正点 ▼▼▼ ---
		// ネストされた value プロパティを正しく参照する
		const avatarUrl = user.avatar?.value || "/default.png";
		const userName = user.name?.value || "Unnamed User";
		// --- ▲▲▲ ここまで ▲▲▲ ---

		li.innerHTML = `
            <img src="${avatarUrl}" alt="${userName}'s avatar" class="participant-avatar">
            <div class="participant-info">
                <span class="participant-name">${userName}</span>
            </div>
        `;

		listElement.appendChild(li);
	});
}

function updateUI() {
	// ルームIDと役割
	const roomIdDisplay = document.getElementById("room-id-display");
	if (roomIdDisplay) roomIdDisplay.textContent = state.roomInfo?.id || "...";

	const userRoleDisplay = document.getElementById("user-role-display");
	if (userRoleDisplay)
		userRoleDisplay.textContent = state.isOwner ? "Owner" : "Guest";

	// 参加者数
	const participantCount = document.getElementById("participant-count");
	if (participantCount)
		participantCount.textContent = state.participants.length.toString();

	// Start Game ボタンの表示制御
	const startGameButton = document.getElementById(
		"start-game-button",
	) as HTMLButtonElement;
	if (startGameButton) {
		// オーナーであり、2人以上いて、WebSocketが接続されている場合のみ表示
		const canStart =
			state.isOwner && state.participants.length >= 2 && state.isWsConnected;
		startGameButton.hidden = !canStart;
	}

	// Leave/Delete ボタンの状態制御
	const leaveDeleteButton = document.getElementById(
		"leave-delete-button",
	) as HTMLButtonElement;
	if (leaveDeleteButton) {
		leaveDeleteButton.disabled = !state.isWsConnected;
		if (state.isWsConnected) {
			if (state.isOwner) {
				leaveDeleteButton.textContent = "Delete Room";
				leaveDeleteButton.className = "btn delete";
			} else {
				leaveDeleteButton.textContent = "Leave Room";
				leaveDeleteButton.className = "btn leave";
			}
		} else {
			leaveDeleteButton.textContent = "Connecting...";
			leaveDeleteButton.className = "btn";
		}
	}

	// 参加者リストの再描画
	renderParticipantsList();
}
// --- WebSocket ---
function sendWsMessage(message: WSIncomingMsg) {
	if (websocket && websocket.readyState === WebSocket.OPEN) {
		websocket.send(JSON.stringify(message));
	} else {
		console.error("WebSocket is not connected.");
	}
}

function handleWsMessage(event: MessageEvent) {
	try {
		const message = JSON.parse(event.data) as WSOutgoingMsg;
		console.log("Received WS message:", message);

		if (message.status === "Room" && message.data.action === "USER") {
			state.participants = message.data.users;
			renderParticipantsList();
		} else if (message.status === "Room" && message.data.action === "DELETE") {
			alert("The room has been deleted by the owner.");
			window.history.pushState({}, "", "/lobby");
			window.dispatchEvent(new PopStateEvent("popstate"));
		}
	} catch (err) {
		console.error("Failed to parse WebSocket message:", err);
	}
}

function setupWebSocket(roomId: string, token: string) {
	if (
		websocket &&
		(websocket.readyState === WebSocket.OPEN ||
			websocket.readyState === WebSocket.CONNECTING)
	) {
		return;
	}

	const wsUrl = `wss://localhost:8080/wss?token=${token}`;
	websocket = new WebSocket(wsUrl);

	websocket.onopen = () => {
		console.log("WebSocket connected!");
		state.isWsConnected = true;
		updateUI();
		sendWsMessage({
			status: "User",
			action: "ADD",
			room: roomId,
		});
	};

	websocket.onmessage = handleWsMessage;

	websocket.onclose = (event) => {
		console.log("WebSocket disconnected:", event.reason);
		state.isWsConnected = false;
		websocket = null;
		updateUI();
	};

	websocket.onerror = (error) => {
		console.error("WebSocket error:", error);
	};
}

// --- イベントハンドラ ---
function handleLeaveOrDelete() {
	if (state.isOwner) {
		if (
			window.confirm(
				"Are you sure? This will delete the room and kick everyone.",
			)
		) {
			sendWsMessage({ status: "Room", action: "DELETE" });
		}
	} else {
		const roomId = state.roomInfo?.id;
		if (roomId) {
			sendWsMessage({ status: "User", action: "DELETE", room: roomId });
			window.history.pushState({}, "", "/lobby");
			window.dispatchEvent(new PopStateEvent("popstate"));
		}
	}
}

// --- メイン関数 ---
export function renderRoomPage(params?: { [key: string]: string }) {
	const container = document.getElementById("app");
	if (!container) return;
	container.innerHTML = roomHtml;

	const headerHost = container.querySelector("#header-widget") as HTMLElement;
	if (headerHost) {
		HeaderWidget(headerHost);
	}

	const sidebarHost = container.querySelector("#sidebar-widget") as HTMLElement;
	if (sidebarHost) {
		SidebarWidget(sidebarHost);
	}

	const roomId = params?.roomId;
	if (!roomId) {
		console.error("Room ID not provided in params");
		return;
	}

	const token = localStorage.getItem("accessToken");
	if (!token) {
		console.error("Access token not found.");
		return;
	}
	state.myUserId = decodeJwt(token)?.id || null;
	if (!state.myUserId) {
		console.error("Could not get user ID from token");
		return;
	}

	fetch(`https://localhost:8080/rooms/${roomId}`, {
		headers: { Authorization: `Bearer ${token}` },
	})
		.then((res) => {
			if (!res.ok) throw new Error("Failed to fetch room data");
			return res.json();
		})
		.then((roomData) => {
			state.roomInfo = roomData;
			state.isOwner = state.roomInfo.ownerId === state.myUserId;
			updateUI();
			setupWebSocket(roomId, token);
		})
		.catch((err) => {
			console.error(err);
			const messageArea = document.getElementById("message-area");
			if (messageArea) messageArea.textContent = `Error: ${err.message}`;
		});

	const button = document.getElementById("leave-delete-button");
	if (button) button.addEventListener("click", handleLeaveOrDelete);
}
