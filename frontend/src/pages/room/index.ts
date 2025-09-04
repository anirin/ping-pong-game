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
import { WebSocketManager } from "../../shared/websocket/WebSocketManager";

// --- グローバル状態管理 ---
const state = {
	myUserId: null as string | null,
	roomInfo: null as any | null,
	participants: [] as RoomUser[],
	isOwner: false,
	isWsConnected: false,
};

const wsManager = WebSocketManager.getInstance();

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
	if (wsManager.isConnected()) {
		wsManager.sendMessage(message);
	} else {
		console.error("WebSocket is not connected.");
	}
}

function handleWsMessage(message: WSOutgoingMsg) {
	try {
		console.log("Received WS message:", message);

		if (message.status === "Room") {
			if (message.data.action === "START") {
				console.log("Room started, navigating to tournament");
				navigate("/tournament");
				return;
			}

			const roomData = message.data as WSRoomData;
			state.participants = roomData.users;

			// WebSocketから受け取ったroomInfoで状態を更新
			if (roomData.roomInfo) {
				state.roomInfo = roomData.roomInfo;
				state.isOwner = roomData.roomInfo.ownerId === state.myUserId;
			}

			updateUI();
		} else {
			// else がいるのか？ delete は存在するのか？
			alert("The room has been deleted by the owner.");
			navigate("/lobby");
		}
	} catch (err) {
		console.error("Failed to parse WebSocket message:", err);
	}
}

async function setupWebSocket(roomId: string) {
	try {
		console.log("Room : connect to room");
		await wsManager.connect(roomId);
		
		// メッセージハンドラーを設定
		wsManager.setMessageHandler((message: any) => {
			console.log("WebSocket incoming message:", message);
			
			handleWsMessage(message as WSOutgoingMsg);
		});
		
		state.isWsConnected = true;
		console.log("WebSocket connected!");
	} catch (error) {
		console.error("WebSocket connection error:", error);
		state.isWsConnected = false;
	}
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
		// WebSocketのメッセージハンドラーを削除
		wsManager.removeMessageHandler();
		navigate("/lobby");
	}
}

function cleanupRoomPage() {
	console.log("Cleaning up Room Page state and WebSocket...");

	// WebSocketのメッセージハンドラーを削除
	wsManager.removeMessageHandler();

	// イベントリスナーを削除
	const button = document.getElementById("leave-delete-button");
	if (button) button.replaceWith(button.cloneNode(true));
	const startGameButton = document.getElementById("start-game-button");
	if (startGameButton)
		startGameButton.replaceWith(startGameButton.cloneNode(true));

	// stateオブジェクトを初期状態にリセット
	state.myUserId = null;
	state.roomInfo = null;
	state.participants = [];
	state.isOwner = false;
	state.isWsConnected = false;
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
	setupWebSocket(roomId);

	const button = document.getElementById("leave-delete-button");
	if (button) button.addEventListener("click", handleLeaveOrDelete);

	const startGameButton = document.getElementById("start-game-button");
	if (startGameButton) {
		startGameButton.addEventListener("click", () => {
			sendWsMessage({ status: "Room", action: "START" });
		});
	}
	return cleanupRoomPage;
}
