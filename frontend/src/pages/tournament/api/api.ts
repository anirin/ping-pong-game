import type { IncomingMsg, OutgoingMsg, TournamentState } from "../model/model.js";

export class TournamentWebSocketAPI {
	private ws: WebSocket | null = null;
	private state: TournamentState;
	private onStateChange: ((state: TournamentState) => void) | null = null;

	constructor() {
		this.state = {
			tournament: null,
			currentMatch: null,
			participants: [],
			roomId: null,
			userId: null,
			isConnected: false,
			isLoading: false,
			error: null,
		};
	}

	// 状態変更のコールバックを設定
	setStateChangeCallback(callback: (state: TournamentState) => void) {
		this.onStateChange = callback;
	}

	// 状態を更新してコールバックを呼び出し
	private updateState(updates: Partial<TournamentState>) {
		this.state = { ...this.state, ...updates };
		if (this.onStateChange) {
			this.onStateChange(this.state);
		}
	}

	// WebSocket接続を確立
	connect(roomId: string, userId: string): Promise<void> {
				return new Promise((resolve, reject) => {
			try {
						// HTTPS接続を試す（バックエンドがHTTPSで動作しているため）
		const wsUrl = `wss://localhost:8080/ws/tournament`;
				console.log("WebSocket接続を試行中:", wsUrl);
				// WebSocket接続を確立（バックエンドのエンドポイントに合わせる）
				this.ws = new WebSocket(wsUrl);
				
				this.ws.onopen = () => {
					console.log("WebSocket接続が確立されました");
					this.updateState({ 
						isConnected: true, 
						roomId, 
						userId,
						error: null 
					});
					
					// ルームにサブスクライブ
					this.sendMessage({
						action: "subscribe",
						room_id: roomId,
						user_id: userId
					});
					
					resolve();
				};

				this.ws.onmessage = (event) => {
					try {
						const message: OutgoingMsg = JSON.parse(event.data);
						this.handleMessage(message);
					} catch (error) {
						console.error("メッセージの解析に失敗しました:", error);
						this.updateState({ error: "メッセージの解析に失敗しました" });
					}
				};

				this.ws.onerror = (error) => {
					console.error("WebSocketエラー:", error);
					console.error("WebSocket接続URL:", `wss://localhost:8080/ws/tournament`);
					this.updateState({ 
						isConnected: false, 
						error: "WebSocket接続エラー - バックエンドが起動しているか確認してください" 
					});
					reject(error);
				};

				this.ws.onclose = () => {
					console.log("WebSocket接続が閉じられました");
					this.updateState({ isConnected: false });
				};

			} catch (error) {
				console.error("WebSocket接続の確立に失敗しました:", error);
				this.updateState({ 
					isConnected: false, 
					error: "WebSocket接続の確立に失敗しました" 
				});
				reject(error);
			}
		});
	}

	// メッセージを送信
	private sendMessage(message: IncomingMsg) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			console.error("WebSocketが接続されていません");
			this.updateState({ error: "WebSocketが接続されていません" });
		}
	}

	// 受信メッセージを処理
	private handleMessage(message: OutgoingMsg) {
		switch (message.type) {
			case "subscribed":
				console.log("ルームにサブスクライブしました:", message);
				break;

			case "tournament_started":
				console.log("トーナメントが開始されました:", message);
				this.updateState({
					tournament: message.tournament,
					currentMatch: message.next_match,
					isLoading: false,
					error: null
				});
				break;

			case "round_generated":
				console.log("次のラウンドが生成されました:", message);
				this.updateState({
					tournament: message.tournament,
					currentMatch: message.next_match,
					isLoading: false,
					error: null
				});
				break;

			case "tournament_finished":
				console.log("トーナメントが終了しました:", message);
				this.updateState({
					tournament: message.tournament,
					currentMatch: null,
					isLoading: false,
					error: null
				});
				break;

			case "next_match":
				console.log("次のマッチ情報:", message);
				this.updateState({
					currentMatch: message.next_match,
					isLoading: false,
					error: null
				});
				break;

			case "error":
				console.error("サーバーエラー:", message.message);
				this.updateState({ 
					error: message.message,
					isLoading: false 
				});
				break;

			default:
				console.warn("未知のメッセージタイプ:", message);
		}
	}

	// トーナメントを開始
	startTournament(participants: string[], createdBy: string) {
		if (!this.state.roomId) {
			this.updateState({ error: "ルームIDが設定されていません" });
			return;
		}

		this.updateState({ isLoading: true, participants });
		
		this.sendMessage({
			action: "start_tournament",
			room_id: this.state.roomId,
			created_by: createdBy,
			participants
		});
	}

	// 次のラウンドを生成
	generateNextRound(tournamentId: string) {
		if (!this.state.roomId) {
			this.updateState({ error: "ルームIDが設定されていません" });
			return;
		}

		this.updateState({ isLoading: true });
		
		this.sendMessage({
			action: "next_round",
			tournament_id: tournamentId,
			room_id: this.state.roomId
		});
	}

	// 次のマッチを取得
	getNextMatch(tournamentId: string) {
		if (!this.state.roomId) {
			this.updateState({ error: "ルームIDが設定されていません" });
			return;
		}

		this.updateState({ isLoading: true });
		
		this.sendMessage({
			action: "get_next_match",
			tournament_id: tournamentId,
			room_id: this.state.roomId
		});
	}

	// トーナメントを終了
	finishTournament(tournamentId: string, winnerId: string) {
		if (!this.state.roomId) {
			this.updateState({ error: "ルームIDが設定されていません" });
			return;
		}

		this.updateState({ isLoading: true });
		
		this.sendMessage({
			action: "finish_tournament",
			tournament_id: tournamentId,
			room_id: this.state.roomId,
			winner_id: winnerId
		});
	}

	// 接続を切断
	disconnect() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.updateState({ 
			isConnected: false, 
			tournament: null, 
			currentMatch: null 
		});
	}

	// 現在の状態を取得
	getState(): TournamentState {
		return { ...this.state };
	}
}