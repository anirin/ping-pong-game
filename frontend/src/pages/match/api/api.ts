import {
	WebSocketManager,
	type WebSocketMessage,
} from "../../../shared/websocket/WebSocketManager";

export interface PaddleStateDto {
	id: string;
	y: number;
}

export interface RealtimeMatchStateDto {
	status: "scheduled" | "playing" | "finished" | "canceled";
	ball: { x: number; y: number };
	paddles: {
		player1: PaddleStateDto;
		player2: PaddleStateDto;
	};
	scores: {
		player1: number;
		player2: number;
	};
}

export interface MatchMessage extends WebSocketMessage {
	status: "Match";
	action: "start" | "move" | "ready" | "get_initial_state";
	matchId?: string;
	data?: { y: number } | { isReady: boolean };
}

export class MatchAPI {
	private matchId: string | null = null;
	private userId: string | null = null;

	private matchData: RealtimeMatchStateDto | null = null;
	private wsManager: WebSocketManager;
	private readyPlayers: Set<string> = new Set();
	private isReady: boolean = false;
	private messageHandler: (message: WebSocketMessage) => void;
	private controllerCallback: ((data: any, action?: string) => void) | null =
		null;

	constructor() {
		this.wsManager = WebSocketManager.getInstance();
		this.messageHandler = this.handleMessage.bind(this);
		this.wsManager.setCallback(this.messageHandler);
		this.readyPlayers.clear();
		this.isReady = false;
		this.initializeUserId();
	}

	// getter
	public getMatchData(): RealtimeMatchStateDto | null {
		return this.matchData;
	}

	public getMatchStatus(): string | null {
		return this.matchData?.status || null;
	}

	public getPlayerRole(): "player1" | "player2" | "spectator" | null {
		if (!this.matchData || !this.userId) return null;

		if (this.userId === this.matchData.paddles.player1.id) {
			return "player1";
		} else if (this.userId === this.matchData.paddles.player2.id) {
			return "player2";
		} else {
			return "spectator";
		}
	}

	public getReadyPlayerCount(): number {
		return this.readyPlayers.size;
	}

	public isCurrentUserReady(): boolean {
		return this.isReady;
	}

	public isConnected(): boolean {
		return this.wsManager.isConnected();
	}

	// setter
	public setCallback(callback: (data: any, action?: string) => void): void {
		this.controllerCallback = callback;
	}

	public setMatchId(matchId: string): void {
		this.matchId = matchId;
	}

	public removeCallback(): void {
		this.controllerCallback = null;
	}

	// destroy
	public destroy(): void {
		this.wsManager.removeCallback();
		this.resetAllValues();
	}

	// WebSocket接続を確保
	public async ensureConnection(roomId: string): Promise<void> {
		if (!roomId) {
			throw new Error("Room ID is required for match");
		}

		if (!this.userId) {
			throw new Error("User ID is required for match");
		}

		if (this.wsManager.isConnected()) {
			return;
		}

		try {
			await this.wsManager.connect(roomId);
		} catch (error) {
			console.error("Failed to connect to WebSocket for match:", error);
			throw error;
		}
	}

	// 送信 マッチ情報の取得
	public sendMatchStart(): void {
		// WebSocket接続状態を確認し、接続されていない場合は警告を出す
		if (!this.wsManager.isConnected()) {

		}


		this.wsManager.sendMessage({
			status: "Match",
			action: "get_initial_state",
			matchId: this.matchId,
		});
	}

	// 送信 パドルの移動
	public sendPaddleMove(position: { y: number }): void {
		this.wsManager.sendMessage({
			status: "Match",
			action: "move",
			matchId: this.matchId,
			data: position,
		});
	}

	// 送信 ready
	public sendReady(): void {
		if (!this.userId) {
			return;
		}

		// 既にready状態の場合は何もしない
		if (this.isReady) {
			return;
		}

		this.isReady = true;
		this.sendReadyToServer(this.isReady);
	}

	// ------------------------------------------------------------
	// private methods
	// ------------------------------------------------------------

	private handleMessage(message: WebSocketMessage): void {
		if (message.status === "Room" && message.data?.action === "DELETE") {
			// ルーム削除の通知
			if (this.controllerCallback) {
				this.controllerCallback(message.data, "room_deleted");
			}
			return;
		}

		if (message.status === "Room" && message.data?.action === "FORCE_LOBBY") {
			// 強制的にlobbyに戻す通知
			if (this.controllerCallback) {
				this.controllerCallback(message.data, "force_lobby");
			}
			return;
		}

		if (message.status !== "Match") {
			return;
		}

		try {
			if (!message.data) {
				// todo : 適切なerrorを投げる
				return;
			}
			if (!this.controllerCallback) {
				// todo : 適切なerrorを投げる
				return;
			}

			if (message.data.type === "match_state" && message.data.state) {
				this.matchData = message.data.state as RealtimeMatchStateDto;
				this.controllerCallback(this.matchData, "match_state");
			} else if (message.data.type === "match_started") {
				this.controllerCallback(message.data, "match_started");
			} else if (message.data.type === "match_finished") {
				this.controllerCallback(message.data, "match_finished");
			} else if (message.data.type === "error") {
				console.error("MatchAPI: Match error:", message.data.message);
				this.controllerCallback(message.data, "error");
			} else if (message.data.type === "ready_state") {
				this.updateReadyStateFromServer(message.data.readyPlayers);
				this.controllerCallback(message.data, "ready_state");
			} else if (message.action === "get_initial_state") {
				// 初期状態のデータが含まれている場合はmatchDataを更新
				if (message.data.state) {
					this.matchData = message.data.state as RealtimeMatchStateDto;
				}
				this.controllerCallback(message.data, "get_initial_state");
			}
		} catch (error) {
			console.error("Failed to handle match message:", error);
		}
	}

	private updateReadyStateFromServer(readyPlayers: string[]): void {
		this.readyPlayers.clear();
		for (const playerId of readyPlayers) {
			this.readyPlayers.add(playerId);
		}

		if (this.userId) {
			this.isReady = this.readyPlayers.has(this.userId);
		}
	}

	private sendReadyToServer(isReady: boolean): void {
		if (!this.matchId) {
			console.error("Match ID is not set");
			return;
		}

		const playerRole = this.getPlayerRole();
		if (playerRole === "spectator") {
			return;
		}

		this.wsManager.sendMessage({
			status: "Match",
			action: "ready",
			matchId: this.matchId,
			data: { isReady },
		});
	}

	private initializeUserId(): void {
		try {
			const token = localStorage.getItem("accessToken");
			if (token) {
				const payload = JSON.parse(atob(token.split(".")[1]));
				if (payload.id) {
					this.userId = payload.id;
				}
			}
		} catch (error) {
			console.error("Failed to initialize user ID:", error);
		}
	}

	private resetAllValues(): void {
		this.matchId = null;
		this.userId = null;
		this.matchData = null;
		this.controllerCallback = null;
		this.readyPlayers.clear();
		this.isReady = false;
	}
}
