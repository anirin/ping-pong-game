import {
	WebSocketManager,
	type WebSocketMessage,
} from "../../../shared/websocket/WebSocketManager";
import { navigate } from "../../../app/routing";
import type { RoomUser } from "../../../types/types";
import type {
	WSIncomingMsg,
	WSRoomData,
} from "../../../types/ws-types";

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
	private static instance: RoomAPI | null = null;
	private roomState: RoomState = {
		myUserId: null,
		roomInfo: null,
		participants: [],
		isOwner: false,
		isWsConnected: false,
	};
	private wsManager: WebSocketManager = WebSocketManager.getInstance();
	private messageHandler: (message: WebSocketMessage) => void;
	private isInitialized: boolean = false;
	private dataUpdateCallbacks: Set<(state: RoomState) => void> = new Set();

	private constructor() {
		this.messageHandler = this.handleMessage.bind(this);
	}

	public static getInstance(): RoomAPI {
		if (!RoomAPI.instance) {
			RoomAPI.instance = new RoomAPI();
		}
		return RoomAPI.instance;
	}

	public initialize(): void {
		if (this.isInitialized) {
			console.warn("RoomAPI is already initialized");
			return;
		}
		this.wsManager.addCallback(this.messageHandler);
		this.isInitialized = true;
		console.log("RoomAPI initialized");
	}

	private handleMessage(message: WebSocketMessage): void {
		if (message.status !== "Room") {
			return;
		}

		try {
			console.log("RoomAPI received message:", message);

			if (message.data && message.data.action === "START") {
				console.log("Room started, navigating to tournament");
				navigate("/tournament");
				return;
			}

			const roomData = message.data as WSRoomData;
			if (roomData) {
				this.roomState.participants = roomData.users || [];

				// WebSocketから受け取ったroomInfoで状態を更新
				if (roomData.roomInfo) {
					this.roomState.roomInfo = roomData.roomInfo;
					this.roomState.isOwner = roomData.roomInfo.ownerId === this.roomState.myUserId;
				}

				this.notifyDataUpdate();
			}
		} catch (error) {
			console.error("Failed to handle room message:", error);
		}
	}

	public async connectToRoom(roomId: string, userId: string): Promise<void> {
		try {
			this.roomState.myUserId = userId;
			await this.wsManager.connect(roomId);

			if (!this.wsManager.isConnected()) {
				throw new Error("WebSocket connection failed");
			}

			this.roomState.isWsConnected = true;
			console.log("Connected to room:", roomId);
		} catch (error) {
			console.error("WebSocket connection error:", error);
			this.roomState.isWsConnected = false;
			throw error;
		}
	}

	public sendMessage(message: WSIncomingMsg): void {
		if (this.wsManager.isConnected()) {
			this.wsManager.sendMessage(message);
		} else {
			console.error("WebSocket is not connected.");
		}
	}

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
		return this.roomState.isOwner && 
			   this.roomState.participants.length >= 2 && 
			   this.roomState.isWsConnected;
	}

	public addDataUpdateCallback(callback: (state: RoomState) => void): void {
		this.dataUpdateCallbacks.add(callback);
	}

	public removeDataUpdateCallback(callback: (state: RoomState) => void): void {
		this.dataUpdateCallbacks.delete(callback);
	}

	private notifyDataUpdate(): void {
		this.dataUpdateCallbacks.forEach(callback => {
			try {
				callback(this.getRoomState());
			} catch (error) {
				console.error("Data update callback error:", error);
			}
		});
	}

	public destroy(): void {
		if (!this.isInitialized) {
			console.warn("RoomAPI is not initialized");
			return;
		}
		this.wsManager.removeCallback(this.messageHandler);
		this.dataUpdateCallbacks.clear();
		this.roomState = {
			myUserId: null,
			roomInfo: null,
			participants: [],
			isOwner: false,
			isWsConnected: false,
		};
		this.isInitialized = false;
		console.log("RoomAPI destroyed");
	}

	public static reset(): void {
		if (RoomAPI.instance) {
			RoomAPI.instance.destroy();
			RoomAPI.instance = null;
		}
	}
}

// シングルトンインスタンスの取得関数
export function getRoomAPI(): RoomAPI {
	return RoomAPI.getInstance();
}
