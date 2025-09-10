import {
	WebSocketManager,
	type WebSocketMessage,
} from "../../../shared/websocket/WebSocketManager";
import type { RoomUser } from "../../../types/types";
import type { WSIncomingMsg, WSRoomData } from "../../../types/ws-types";

export interface RoomState {
	myUserId: string | null;
	roomInfo: any | null;
	participants: RoomUser[];
	isOwner: boolean;
	isWsConnected: boolean;
}

export interface RoomMessage extends WebSocketMessage {
	status: "Room";
	action: "START" | "DELETE" | "LEAVE";
	data?: any;
}

export class RoomAPI {
	private roomState: RoomState = {
		myUserId: null,
		roomInfo: null,
		participants: [],
		isOwner: false,
		isWsConnected: false,
	};
	private wsManager: WebSocketManager = WebSocketManager.getInstance();
	private messageHandler: (message: WebSocketMessage) => void;
	private controllerCallback:
		| ((state: RoomState, action?: string) => void)
		| null = null;

	constructor() {
		this.messageHandler = this.handleMessage.bind(this);
		this.wsManager.setCallback(this.messageHandler);
	}

	private handleMessage(message: WebSocketMessage): void {
		if (message.status !== "Room") {
			return;
		}

		try {
			if (message.data && message.data.action === "START") {
				// コールバックにアクション情報を渡す
				if (this.controllerCallback) {
					this.controllerCallback(this.getRoomState(), "START");
				}
				return;
			}

			if (message.data && message.data.action === "DELETE") {
				// ルーム削除の処理
				if (this.controllerCallback) {
					this.controllerCallback(this.getRoomState(), "DELETE");
				}
				return;
			}

			if (message.data && message.data.action === "FORCE_LOBBY") {
				// 強制的にlobbyに戻す処理
				if (this.controllerCallback) {
					this.controllerCallback(this.getRoomState(), "FORCE_LOBBY");
				}
				return;
			}

			const roomData = message.data as WSRoomData;
			if (roomData) {
				this.roomState.participants = roomData.users || [];

				if (roomData.roomInfo) {
					this.roomState.roomInfo = roomData.roomInfo;
					this.roomState.isOwner =
						roomData.roomInfo.ownerId === this.roomState.myUserId;
				}

				// 通常の状態更新
				if (this.controllerCallback) {
					this.controllerCallback(this.getRoomState());
				}
			}
		} catch (error) {
			console.error("Failed to handle room message:", error);
		}
	}

	// websocket に接続しているだけ
	public async connectToRoom(
		roomId: string,
		userId: string,
		maxRetries: number = 3,
	): Promise<void> {
		this.roomState.myUserId = userId;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await this.wsManager.connect(roomId);

				if (!this.wsManager.isConnected()) {
					throw new Error("WebSocket connection failed");
				}

				this.roomState.isWsConnected = true;
				return; // 成功したら終了
			} catch (error) {
				console.error(`WebSocket connection attempt ${attempt} failed:`, error);
				this.roomState.isWsConnected = false;

				if (attempt === maxRetries) {
					throw error; // 最後の試行でも失敗した場合はエラーを投げる
				}

				// リトライ前に少し待機（指数バックオフ）
				const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	// websocket を介して room の処理
	public startGame(): void {
		this.sendMessage({ status: "Room", action: "START" });
	}

	public deleteRoom(): void {
		this.sendMessage({ status: "Room", action: "DELETE" });
	}

	public leaveRoom(): void {
		this.sendMessage({ status: "Room", action: "LEAVE" });
	}

	public getRoomState(): RoomState {
		return { ...this.roomState };
	}

	public getParticipants(): RoomUser[] {
		return [...this.roomState.participants];
	}

	public isOwner(): boolean {
		return this.roomState.isOwner;
	}

	public isConnected(): boolean {
		return this.roomState.isWsConnected;
	}

	public canStartGame(): boolean {
		return (
			this.roomState.isOwner &&
			this.roomState.participants.length >= 4 &&
			this.roomState.isWsConnected
		);
	}

	public setCallback(
		callback: (state: RoomState, action?: string) => void,
	): void {
		this.controllerCallback = callback;
	}

	public removeCallback(): void {
		this.controllerCallback = null;
	}

	// ------------------------------------------------------------
	// private method
	// ------------------------------------------------------------

	private sendMessage(message: WSIncomingMsg): void {
		if (this.wsManager.isConnected()) {
			this.wsManager.sendMessage(message);
		} else {
			console.error("WebSocket is not connected.");
		}
	}

	public destroy(): void {
		this.wsManager.removeCallback();
		this.controllerCallback = null;
		this.roomState = {
			myUserId: null,
			roomInfo: null,
			participants: [],
			isOwner: false,
			isWsConnected: false,
		};
	}
}
