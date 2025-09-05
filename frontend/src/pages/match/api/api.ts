import {
	WebSocketManager,
	type WebSocketMessage,
} from "../../../shared/websocket/WebSocketManager";
import { navigate } from "../../../app/routing";

// マッチ関連の型定義
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

// マッチ専用のメッセージ型（バックエンドに合わせて修正）
export interface MatchMessage extends WebSocketMessage {
	status: "Match";
	action: "start" | "move" | "ready" | "get_initial_state";
	matchId?: string;
	data?: { y: number } | { isReady: boolean };
}

export class MatchAPI {
	private matchData: RealtimeMatchStateDto | null = null;
	private matchId: string | null = null;
	private userId: string | null = null;
	private wsManager: WebSocketManager = WebSocketManager.getInstance();
	private readyPlayers: Set<string> = new Set();
	private isReady: boolean = false;

	constructor() {
		this.wsManager.addCallback(this.handleMessage.bind(this));
	}

	// マッチメッセージの処理(受信)
	private handleMessage(message: WebSocketMessage): void {
		if (message.status !== "Match") {
			return;
		}

		// バックエンドからのメッセージタイプに応じて処理
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
			// マッチ終了時にtournamentページにナビゲート
			navigate("/tournament");
		} else if (message.data && message.data.type === "error") {
			console.error("Match error:", message.data.message);
		} else if (message.data && message.data.type === "ready_state") {
			console.log("Ready state updated:", message.data);
			this.updateReadyStateFromServer(message.data.readyPlayers, message.data.readyCount);
		}
	}

	// マッチにサブスクライブ（接続のみ、startアクションは送信しない）
	public subscribeToMatch(matchId: string, userId: string): void {
		this.matchId = matchId;
		this.userId = userId;
		
		console.log("MatchAPI: マッチにサブスクライブ", { matchId, userId });
		
		// 初期マッチ状態を要求
		this.requestInitialMatchState();
	}

	// 初期マッチ状態を要求
	private requestInitialMatchState(): void {
		if (!this.matchId) {
			console.error("Match ID is not set");
			return;
		}

		console.log("MatchAPI: 初期マッチ状態を要求", this.matchId);
		this.wsManager.sendMessage({
			status: "Match",
			action: "get_initial_state",
			matchId: this.matchId,
		});
	}

	// マッチを開始する（適切なタイミングで呼び出す）
	public startMatch(): void {
		if (!this.matchId) {
			console.error("Match ID is not set");
			return;
		}
		
		console.log("MatchAPI: マッチを開始", this.matchId);
		this.wsManager.sendMessage({
			status: "Match",
			action: "start",
			matchId: this.matchId,
		});
	}

	// player1からのみマッチを開始する
	public startMatchIfPlayer1(): void {
		if (!this.matchId || !this.userId) {
			console.error("Match ID or User ID is not set");
			return;
		}

		// 現在のユーザーがplayer1かどうかチェック
		const playerRole = this.getPlayerRole();
		if (playerRole === "player1") {
			console.log("MatchAPI: Player1がマッチを開始", this.matchId);
			this.startMatch();
		} else {
			console.log("MatchAPI: Player1以外なのでマッチ開始をスキップ", { role: playerRole, userId: this.userId });
		}
	}

	// プレイヤーの準備状態を設定
	public setPlayerReady(userId: string, isReady: boolean): void {
		if (isReady) {
			this.readyPlayers.add(userId);
		} else {
			this.readyPlayers.delete(userId);
		}
		console.log(`Player ${userId} ready state: ${isReady}, Total ready: ${this.readyPlayers.size}`);
	}

	// 準備完了プレイヤー数を取得
	public getReadyPlayerCount(): number {
		return this.readyPlayers.size;
	}

	// 現在のユーザーが準備完了かどうか
	public isCurrentUserReady(): boolean {
		return this.isReady;
	}

	// 現在のユーザーの準備状態を切り替え
	public toggleReadyState(): void {
		if (!this.userId) return;
		
		this.isReady = !this.isReady;
		
		// バックエンドにready状態を送信
		this.sendReadyStateToServer(this.isReady);
	}

	// バックエンドにready状態を送信
	private sendReadyStateToServer(isReady: boolean): void {
		if (!this.matchId) {
			console.error("Match ID is not set");
			return;
		}

		// ユーザーがマッチのプレイヤーかどうかをチェック
		const playerRole = this.getPlayerRole();
		if (playerRole === "spectator") {
			console.log("Spectator cannot set ready state, ignoring");
			return;
		}

		console.log("Sending ready state to server:", { matchId: this.matchId, isReady, playerRole });
		this.wsManager.sendMessage({
			status: "Match",
			action: "ready",
			matchId: this.matchId,
			data: { isReady },
		});
	}

	// バックエンドから受信したready状態を更新
	private updateReadyStateFromServer(readyPlayers: string[], readyCount: number): void {
		// ローカルのready状態を更新
		this.readyPlayers.clear();
		readyPlayers.forEach(playerId => this.readyPlayers.add(playerId));

		// 現在のユーザーのready状態を更新
		if (this.userId) {
			this.isReady = this.readyPlayers.has(this.userId);
		}

		// 2人とも準備完了の場合、player1からのみマッチを開始
		if (readyCount >= 2) {
			this.startMatchIfPlayer1();
		}
	}

	// パドルの移動を送信（バックエンドのmoveアクションを使用）
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

	// マッチデータの取得
	public getMatchData(): RealtimeMatchStateDto | null {
		return this.matchData;
	}

	// マッチIDの取得
	public getMatchId(): string | null {
		return this.matchId;
	}

	// ユーザーIDの取得
	public getUserId(): string | null {
		return this.userId;
	}

	// マッチの状態を取得
	public getMatchStatus(): string | null {
		return this.matchData?.status || null;
	}

	// プレイヤーの役割を判定
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
		this.wsManager.removeCallback(this.handleMessage.bind(this));
		console.log("MatchAPI: 破棄");
	}
}

export const matchAPI = new MatchAPI();
