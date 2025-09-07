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
		console.log("MatchAPI constructor");
		this.wsManager = WebSocketManager.getInstance();
		console.log("WebSocket接続状態:", this.wsManager.getConnectionState());
		this.messageHandler = this.handleMessage.bind(this);
		this.wsManager.setCallback(this.messageHandler);
		this.resetReadyState();
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

	// 送信 マッチ情報の取得
	public sendMatchStart(): void {
		// WebSocket接続状態を確認し、接続されていない場合は警告を出す
		if (!this.wsManager.isConnected()) {
			console.warn(
				"WebSocket is not connected. MatchAPI may not receive messages.",
			);
		}

		console.log("マッチ情報の取得を送信しました");

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

	// 送信 準備完了
	public sendReady(): void {
		if (!this.userId) {
			console.error("Cannot send ready: userId is not set");
			return;
		}

		console.log("Sending ready state, current isReady:", this.isReady);
		this.isReady = !this.isReady;
		console.log("New isReady state:", this.isReady);

		this.sendReadyToServer(this.isReady);
	}

	// 送信 マッチの開始
	public startMatchIfPlayer1(): void {
		if (!this.matchId || !this.userId) {
			console.error("Match ID or User ID is not set");
			return;
		}

		const playerRole = this.getPlayerRole();
		if (playerRole === "player1") {
			this.startMatch();
		}
	}

	// ------------------------------------------------------------
	// private methods
	// ------------------------------------------------------------

	private resetReadyState(): void {
		this.readyPlayers.clear();
		this.isReady = false;
	}

	private handleMessage(message: WebSocketMessage): void {
		console.log("MatchAPI received message:", message);

		if (message.status === "Room" && message.data?.action === "DELETE") {
			// ルーム削除の通知
			console.log("MatchAPI: Room deleted", message.data);
			if (this.controllerCallback) {
				this.controllerCallback(message.data, "room_deleted");
			}
			return;
		}

		if (message.status === "Room" && message.data?.action === "FORCE_LOBBY") {
			// 強制的にlobbyに戻す通知
			console.log("MatchAPI: Force lobby", message.data);
			if (this.controllerCallback) {
				this.controllerCallback(message.data, "force_lobby");
			}
			return;
		}

		if (message.status !== "Match") {
			console.error("MatchAPI: 不明なステータス", message.status);
			return;
		}

		try {
			if (
				message.data &&
				message.data.type === "match_state" &&
				message.data.state
			) {
				this.matchData = message.data.state as RealtimeMatchStateDto;
				console.log(
					"MatchAPI: match statusを受信しました:",
					this.matchData.status,
				);
				if (this.controllerCallback) {
					this.controllerCallback(this.matchData, "match_state");
				}
			} else if (message.data && message.data.type === "match_started") {
				console.log("MatchAPI: match_started received");
				if (this.controllerCallback) {
					this.controllerCallback(message.data, "match_started");
				}
			} else if (message.data && message.data.type === "match_finished") {
				console.log("MatchAPI: match_finished received");
				if (this.controllerCallback) {
					this.controllerCallback(message.data, "match_finished");
				}
				// roomIdを含めてtournamentページに遷移（MatchControllerで処理）
			} else if (message.data && message.data.type === "error") {
				console.error("MatchAPI: Match error:", message.data.message);
				if (this.controllerCallback) {
					this.controllerCallback(message.data, "error");
				}
			} else if (message.data && message.data.type === "ready_state") {
				console.log("MatchAPI: ready_state received");
				this.updateReadyStateFromServer(
					message.data.readyPlayers,
					message.data.readyCount,
				);
				if (this.controllerCallback) {
					this.controllerCallback(message.data, "ready_state");
				}
			} else if (message.action === "get_initial_state") {
				console.log("MatchAPI: get_initial_state received");
				if (this.controllerCallback) {
					this.controllerCallback(message.data, "get_initial_state");
				}
			}
		} catch (error) {
			console.error("Failed to handle match message:", error);
		}
	}

	private updateReadyStateFromServer(
		readyPlayers: string[],
		readyCount: number,
	): void {
		this.readyPlayers.clear();
		for (const playerId of readyPlayers) {
			this.readyPlayers.add(playerId);
		}

		if (this.userId) {
			this.isReady = this.readyPlayers.has(this.userId);
		}

		if (readyCount >= 2) {
			this.startMatchIfPlayer1();
		}
	}

	private sendReadyToServer(isReady: boolean): void {
		if (!this.matchId) {
			console.error("Match ID is not set");
			return;
		}

		const playerRole = this.getPlayerRole();
		if (playerRole === "spectator") {
			console.log("Spectator cannot set ready state, ignoring");
			return;
		}

		console.log("Sending ready message to server:", {
			status: "Match",
			action: "ready",
			matchId: this.matchId,
			data: { isReady },
		});

		this.wsManager.sendMessage({
			status: "Match",
			action: "ready",
			matchId: this.matchId,
			data: { isReady },
		});
	}

	// 送信 マッチの開始
	private startMatch(): void {
		this.wsManager.sendMessage({
			status: "Match",
			action: "start",
			matchId: this.matchId,
		});
	}

	private initializeUserId(): void {
		try {
			const token = localStorage.getItem("accessToken");
			if (token) {
				const payload = JSON.parse(atob(token.split(".")[1]));
				if (payload.id) {
					this.userId = payload.id;
					console.log("User ID initialized:", this.userId);
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
		this.resetReadyState();
	}
}
