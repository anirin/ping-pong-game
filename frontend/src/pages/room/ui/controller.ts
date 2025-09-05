import { navigate } from "../../../app/routing";
import type { RoomUser } from "../../../types/types";
import { RoomAPI, type RoomState } from "../api/api";

export class RoomController {
	private roomId: string | null = null;
	private userId: string | null = null;
	private roomAPI = new RoomAPI();
	private dataUpdateCallback: (state: RoomState, action?: string) => void;

	constructor(params?: { [key: string]: string }) {
		console.log("RoomController constructor");
		if (params && params.roomId) {
			this.roomId = params.roomId;
		}
		this.dataUpdateCallback = this.handleDataUpdate.bind(this);
	}

	public async render(): Promise<void> {
		if (!this.roomId) {
			console.error("Room ID not provided");
			return;
		}

		const token = localStorage.getItem("accessToken");
		if (!token) {
			console.error("Access token not found.");
			return;
		}

		try {
			const payload = JSON.parse(atob(token.split(".")[1]));
			this.userId = payload.id;
		} catch (error) {
			console.error("Failed to decode token:", error);
			return;
		}

		// RoomAPIにコールバックを設定
		this.roomAPI.setCallback(this.dataUpdateCallback);

		// WebSocket接続
		await this.connectToRoom();

		// UIの初期化
		this.initializeUI();
		this.setupEventListeners();
	}

	private async connectToRoom(): Promise<void> {
		if (!this.roomId || !this.userId) {
			throw new Error("Room ID or User ID is missing");
		}

		try {
			await this.roomAPI.connectToRoom(this.roomId, this.userId);
		} catch (error) {
			console.error("Failed to connect to room:", error);

			// ユーザーに分かりやすいエラーメッセージを表示
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			if (errorMessage.includes("Room not found")) {
				alert(
					"ルームが見つかりません。ルームが削除されたか、IDが間違っている可能性があります。",
				);
			} else if (errorMessage.includes("WebSocket connection failed")) {
				alert(
					"サーバーへの接続に失敗しました。しばらく待ってから再度お試しください。",
				);
			} else {
				alert(`ルームへの接続に失敗しました: ${errorMessage}`);
			}

			// エラーが発生した場合はlobbyに戻る
			window.location.href = "/lobby";
			throw error;
		}
	}

	private handleDataUpdate(state: RoomState, action?: string): void {
		if (action === "START") {
			navigate("/tournament");
			return;
		}

		console.log("RoomController: データ更新を受信", state);
		this.updateUI(state);
	}

	private initializeUI(): void {
		// 初期状態でUIを更新
		this.updateUI(this.roomAPI.getRoomState());
	}

	private updateUI(state: RoomState): void {
		// Room ID表示
		const roomIdDisplay = document.getElementById("room-id-display");
		if (roomIdDisplay) {
			roomIdDisplay.textContent = state.roomInfo?.id || "...";
		}

		// ユーザーロール表示
		const userRoleDisplay = document.getElementById("user-role-display");
		if (userRoleDisplay) {
			userRoleDisplay.textContent = state.isOwner ? "Owner" : "Guest";
		}

		// 参加者数表示
		const participantCount = document.getElementById("participant-count");
		if (participantCount) {
			participantCount.textContent = state.participants.length.toString();
		}

		// ゲーム開始ボタン
		const startGameButton = document.getElementById(
			"start-game-button",
		) as HTMLButtonElement;
		if (startGameButton) {
			const canStart = this.roomAPI.canStartGame();
			startGameButton.hidden = !canStart;
		}

		// 退出/削除ボタン
		const leaveDeleteButton = document.getElementById(
			"leave-delete-button",
		) as HTMLButtonElement;
		if (leaveDeleteButton) {
			leaveDeleteButton.disabled = !state.isWsConnected;
			if (state.isWsConnected) {
				leaveDeleteButton.className = state.isOwner
					? "btn delete"
					: "btn leave";
				leaveDeleteButton.textContent = state.isOwner
					? "Delete Room"
					: "Leave Room";
			} else {
				leaveDeleteButton.className = "btn";
				leaveDeleteButton.textContent = "Connecting...";
			}
		}

		// 参加者リスト
		this.renderParticipantsList(state.participants);
	}

	private renderParticipantsList(participants: RoomUser[]): void {
		const listElement = document.getElementById("participants-list");
		if (!listElement) return;

		listElement.innerHTML = "";

		if (participants.length === 0) {
			listElement.innerHTML =
				'<li class="participant-item-empty">Waiting for other players...</li>';
			return;
		}

		participants.forEach((user) => {
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

	private setupEventListeners(): void {
		// ゲーム開始ボタン
		const startGameButton = document.getElementById("start-game-button");
		if (startGameButton) {
			startGameButton.addEventListener("click", () => {
				this.handleStartGame();
			});
		}

		// 退出/削除ボタン
		const leaveDeleteButton = document.getElementById("leave-delete-button");
		if (leaveDeleteButton) {
			leaveDeleteButton.addEventListener("click", () => {
				this.handleLeaveOrDelete();
			});
		}
	}

	private handleStartGame(): void {
		this.roomAPI.startGame();
	}

	private handleLeaveOrDelete(): void {
		const state = this.roomAPI.getRoomState();

		if (state.isOwner) {
			if (
				window.confirm(
					"Are you sure? This will delete the room and kick everyone.",
				)
			) {
				this.roomAPI.deleteRoom();
			}
		} else {
			this.roomAPI.leaveRoom();
			// 退出後はlobbyに戻る
			window.location.href = "/lobby";
		}
	}

	public destroy(): void {
		this.roomAPI.removeCallback();
		this.roomAPI.destroy();
		console.log("RoomController destroyed");
	}
}

export function createRoomController(params?: {
	[key: string]: string;
}): RoomController {
	return new RoomController(params);
}
