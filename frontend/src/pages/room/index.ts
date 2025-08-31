import roomHtml from "./room.html?raw";
import "./room.css";
import { HeaderWidget } from "@widgets/header";
import { SidebarWidget } from "@widgets/sidebar";
import { navigate } from "../../app/routing";
import type { RoomUser } from "../../types/types";
import type {
	WSIncomingMsg,
	WSOutgoingMsg,
	WSRoomData,
} from "../../types/ws-types";

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
		const avatarUrl = user.avatar?.value || "/default.png";
		const userName = user.name?.value || "Unnamed User";
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
	const roomIdDisplay = document.getElementById("room-id-display");
	if (roomIdDisplay) roomIdDisplay.textContent = state.roomInfo?.id || "...";

	const userRoleDisplay = document.getElementById("user-role-display");
	if (userRoleDisplay)
		userRoleDisplay.textContent = state.isOwner ? "Owner" : "Guest";

	const participantCount = document.getElementById("participant-count");
	if (participantCount)
		participantCount.textContent = state.participants.length.toString();

	const startGameButton = document.getElementById(
		"start-game-button",
	) as HTMLButtonElement;
	if (startGameButton) {
		const canStart =
			state.isOwner && state.participants.length >= 2 && state.isWsConnected;
		startGameButton.hidden = !canStart;
	}

	const leaveDeleteButton = document.getElementById(
		"leave-delete-button",
	) as HTMLButtonElement;
	if (leaveDeleteButton) {
		leaveDeleteButton.disabled = !state.isWsConnected;
		if (state.isWsConnected) {
			leaveDeleteButton.className = state.isOwner ? "btn delete" : "btn leave";
			leaveDeleteButton.textContent = state.isOwner
				? "Delete Room"
				: "Leave Room";
		} else {
			leaveDeleteButton.className = "btn";
			leaveDeleteButton.textContent = "Connecting...";
		}
	}
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
			const roomData = message.data as WSRoomData;
			state.participants = roomData.users;

			// WebSocketから受け取ったroomInfoで状態を更新
			if (roomData.roomInfo) {
				state.roomInfo = roomData.roomInfo;
				state.isOwner = state.roomInfo.ownerId === state.myUserId;
			}

			updateUI();
		} else if (message.status === "Room" && message.data.action === "DELETE") {
			alert("The room has been deleted by the owner.");
			navigate("/lobby");
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

	const wsUrl = `wss://localhost:8080/socket?room=${roomId}&token=${token}`;
	websocket = new WebSocket(wsUrl);

	websocket.onopen = () => {
		console.log("WebSocket connected!");
		state.isWsConnected = true;
		// 接続が確立してもすぐにはUIを更新しない。
		// 最初のUSERメッセージ受信時に完全な情報でUIを更新するため。
	};

	websocket.onmessage = handleWsMessage;

	websocket.onclose = (event) => {
		console.log("WebSocket disconnected:", event.reason);
		state.isWsConnected = false;
		websocket = null;
		updateUI(); // 切断されたらUIを更新
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
		if (websocket) {
			websocket.close();
		}
		navigate("/lobby");
	}
}

// --- メイン関数 ---
export function renderRoomPage(params?: { [key: string]: string }) {
	const container = document.getElementById("app");
	if (!container) return;
	container.innerHTML = roomHtml;

	const headerHost = container.querySelector("#header-widget") as HTMLElement;
	if (headerHost) HeaderWidget(headerHost);

	const sidebarHost = container.querySelector("#sidebar-widget") as HTMLElement;
	if (sidebarHost) SidebarWidget(sidebarHost);

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

	// 最初にUIを「接続中」の状態で表示
	updateUI();

	// すぐにWebSocket接続を開始
	setupWebSocket(roomId, token);

	const button = document.getElementById("leave-delete-button");
	if (button) button.addEventListener("click", handleLeaveOrDelete);

	const startGameButton = document.getElementById("start-game-button");
	if (startGameButton) {
		startGameButton.addEventListener("click", () => {
			sendWsMessage({ status: "Room", action: "START" });
		});
	}
}
