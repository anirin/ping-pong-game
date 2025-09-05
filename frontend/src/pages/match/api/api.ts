import {
	WebSocketManager,
	type WebSocketMessage,
} from "../../../shared/websocket/WebSocketManager";
import { navigate } from "../../../app/routing";

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
	private static instance: MatchAPI | null = null;
	private matchData: RealtimeMatchStateDto | null = null;
	private matchId: string | null = null;
	private userId: string | null = null;
	private wsManager: WebSocketManager = WebSocketManager.getInstance();
	private readyPlayers: Set<string> = new Set();
	private isReady: boolean = false;
	private messageHandler: (message: WebSocketMessage) => void;
	private isInitialized: boolean = false;

	private constructor() {
		this.messageHandler = this.handleMessage.bind(this);
	}

	public static getInstance(): MatchAPI {
		if (!MatchAPI.instance) {
			MatchAPI.instance = new MatchAPI();
		}
		return MatchAPI.instance;
	}

	public initialize(): void {
		if (this.isInitialized) {
			console.warn("MatchAPI is already initialized");
			return;
		}
		this.wsManager.addCallback(this.messageHandler);
		this.isInitialized = true;
		console.log("MatchAPI initialized");
	}

	private handleMessage(message: WebSocketMessage): void {
		if (message.status !== "Match") {
			return;
		}

		if (message.data && message.data.type === "match_state" && message.data.state) {
			this.matchData = message.data.state as RealtimeMatchStateDto;
			console.log(
				"Frontend received match data:",
				JSON.stringify(message.data.state, null, 2),
			);
		} else if (message.data && message.data.type === "match_started") {
			console.log("Match started:", message.data.matchId);
		} else if (message.data && message.data.type === "match_finished") {
			console.log("Match finished, winner:", message.data.winnerId);
			navigate("/tournament");
		} else if (message.data && message.data.type === "error") {
			console.error("Match error:", message.data.message);
		} else if (message.data && message.data.type === "ready_state") {
			console.log("Ready state updated:", message.data);
			this.updateReadyStateFromServer(message.data.readyPlayers, message.data.readyCount);
		}
	}

	public subscribeToMatch(matchId: string, userId: string): void {
		this.matchId = matchId;
		this.userId = userId;
		
		this.resetReadyState();
		
		
		this.requestInitialMatchState();
	}

	private requestInitialMatchState(): void {
		if (!this.matchId) {
			console.error("Match ID is not set");
			return;
		}

		this.wsManager.sendMessage({
			status: "Match",
			action: "get_initial_state",
			matchId: this.matchId,
		});
	}

	public startMatch(): void {
		if (!this.matchId) {
			console.error("Match ID is not set");
			return;
		}
		
		this.wsManager.sendMessage({
			status: "Match",
			action: "start",
			matchId: this.matchId,
		});
	}

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


	public resetReadyState(): void {
		this.readyPlayers.clear();
		this.isReady = false;
	}

	public getReadyPlayerCount(): number {
		return this.readyPlayers.size;
	}

	public isCurrentUserReady(): boolean {
		return this.isReady;
	}

	public toggleReadyState(): void {
		if (!this.userId) return;
		
		this.isReady = !this.isReady;
		
		this.sendReadyStateToServer(this.isReady);
	}

	private sendReadyStateToServer(isReady: boolean): void {
		if (!this.matchId) {
			console.error("Match ID is not set");
			return;
		}

		const playerRole = this.getPlayerRole();
		if (playerRole === "spectator") {
			console.log("Spectator cannot set ready state, ignoring");
			return;
		}

		this.wsManager.sendMessage({
			status: "Match",
			action: "ready",
			matchId: this.matchId,
			data: { isReady },
		});
	}

	private updateReadyStateFromServer(readyPlayers: string[], readyCount: number): void {
		this.readyPlayers.clear();
		readyPlayers.forEach(playerId => this.readyPlayers.add(playerId));

		if (this.userId) {
			this.isReady = this.readyPlayers.has(this.userId);
		}

		if (readyCount >= 2) {
			this.startMatchIfPlayer1();
		}
	}

	public sendPaddleMove(position: { y: number }): void {
		if (!this.wsManager.isConnected()) {
			console.warn("WebSocket is not connected");
			return;
		}

		if (!this.matchId) {
			console.warn("Match ID is not set");
			return;
		}

		this.wsManager.sendMessage({
			status: "Match",
			action: "move",
			matchId: this.matchId,
			data: position,
		});
	}

	public getMatchData(): RealtimeMatchStateDto | null {
		return this.matchData;
	}

	public getMatchId(): string | null {
		return this.matchId;
	}

	public getUserId(): string | null {
		return this.userId;
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

	public destroy(): void {
		if (!this.isInitialized) {
			console.warn("MatchAPI is not initialized");
			return;
		}
		this.wsManager.removeCallback(this.messageHandler);
		this.resetReadyState();
		this.matchData = null;
		this.matchId = null;
		this.userId = null;
		this.isInitialized = false;
		console.log("MatchAPI destroyed");
	}

	public static reset(): void {
		if (MatchAPI.instance) {
			MatchAPI.instance.destroy();
			MatchAPI.instance = null;
		}
	}
}

// シングルトンインスタンスの取得関数
export function getMatchAPI(): MatchAPI {
	return MatchAPI.getInstance();
}
