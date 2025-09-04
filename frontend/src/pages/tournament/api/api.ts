import { WebSocketManager, type WebSocketMessage } from "../../../shared/websocket/WebSocketManager";

// トーナメント関連の型定義
export interface TournamentMatch {
	id: string;
	player1_id: string;
	player2_id: string;
	winner_id: string | null;
	status: string;
	round: number;
}

export interface TournamentData {
	next_match_id: string;
	matches: TournamentMatch[];
	current_round: number;
	winner_id: string | null;
}

export interface TournamentIncomingMessage {
	status: "Tournament";
	action: "get_status";
}

export interface TournamentOutgoingMessage {
	status: "Tournament";
	data: TournamentData;
}

// トーナメントAPIクラス
export class TournamentAPI {
	private wsManager: WebSocketManager;
	private messageHandler: ((data: TournamentData) => void) | null = null;
	private tournamentMessageHandler: ((message: WebSocketMessage) => void) | null = null;

	constructor() {
		this.wsManager = WebSocketManager.getInstance();
		this.setupMessageHandler();
	}

	/**
	 * メッセージハンドラーを設定
	 */
	private setupMessageHandler(): void {
		this.tournamentMessageHandler = this.handleTournamentMessage.bind(this);
		this.wsManager.addMessageHandler("Tournament", this.tournamentMessageHandler);
	}

	/**
	 * トーナメントの状態を取得
	 * @returns Promise<void>
	 */
	async getTournamentStatus(): Promise<void> {
		try {
			// 既存のWebSocket接続を使用（接続済みを前提）
			if (!this.wsManager.isConnected()) {
				throw new Error("WebSocketが接続されていません");
			}

			// トーナメントの状態を要求
			const message: TournamentIncomingMessage = {
				status: "Tournament",
				action: "get_status",
			};

			this.wsManager.sendMessage(message);
		} catch (error) {
			console.error("トーナメントの状態取得に失敗しました:", error);
			throw error;
		}
	}

	/**
	 * トーナメントデータの更新を受け取るためのハンドラーを設定
	 * @param handler データ更新時のコールバック関数
	 */
	onTournamentUpdate(handler: (data: TournamentData) => void): void {
		this.messageHandler = handler;
	}

	/**
	 * トーナメントデータの更新ハンドラーを削除
	 */
	removeTournamentUpdateHandler(): void {
		this.messageHandler = null;
		// メッセージハンドラーも削除
		if (this.tournamentMessageHandler) {
			this.wsManager.removeMessageHandler("Tournament", this.tournamentMessageHandler);
			this.tournamentMessageHandler = null;
		}
	}

	/**
	 * トーナメントメッセージを処理する内部メソッド
	 */
	private handleTournamentMessage(message: WebSocketMessage): void {
		if (message.data) {
			const tournamentData: TournamentData = {
				next_match_id: message.data.next_match_id,
				matches: message.data.matches,
				current_round: message.data.current_round,
				winner_id: message.data.winner_id,
			};

			if (this.messageHandler) {
				this.messageHandler(tournamentData);
			}
		}
	}

	/**
	 * WebSocket接続を切断
	 */
	disconnect(): void {
		// メッセージハンドラーを削除
		if (this.tournamentMessageHandler) {
			this.wsManager.removeMessageHandler("Tournament", this.tournamentMessageHandler);
			this.tournamentMessageHandler = null;
		}
		this.wsManager.disconnect();
	}

	/**
	 * 接続状態を取得
	 * @returns 接続状態の文字列
	 */
	getConnectionState(): string {
		return this.wsManager.getConnectionState();
	}

	/**
	 * 接続されているかどうかを確認
	 * @returns 接続状態
	 */
	isConnected(): boolean {
		return this.wsManager.isConnected();
	}
}

// シングルトンインスタンスをエクスポート
export const tournamentAPI = new TournamentAPI();
