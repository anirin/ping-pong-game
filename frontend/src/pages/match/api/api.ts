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
	action: "start" | "move";
	matchId?: string;
	data?: { y: number };
}

export class MatchAPI {
	private matchData: RealtimeMatchStateDto | null = null;
	private matchId: string | null = null;
	private userId: string | null = null;
	private wsManager: WebSocketManager = WebSocketManager.getInstance();

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
		}
	}

	// マッチにサブスクライブ（バックエンドのstartアクションを使用）
	public subscribeToMatch(matchId: string, userId: string): void {
		this.matchId = matchId;
		this.userId = userId;
		
		console.log("MatchAPI: マッチにサブスクライブ", { matchId, userId });
		// バックエンドのstartアクションを使用してマッチを開始
		this.wsManager.sendMessage({
			status: "Match",
			action: "start",
			matchId: matchId,
		});
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
