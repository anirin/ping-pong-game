import type {
	IncomingMsg,
	OutgoingMsg,
	TournamentState,
} from "../model/model.js";
import { WebSocketManager } from "../../../shared/websocket/WebSocketManager";

export class TournamentWebSocketAPI {
	private wsManager: WebSocketManager;
	private state: TournamentState;
	private onStateChange: ((state: TournamentState) => void) | null = null;

	constructor() {
		this.wsManager = WebSocketManager.getInstance();
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
	async connect(roomId: string, userId: string): Promise<void> {
		try {

			// todo : room id を渡す connect を使いまわす
			await this.wsManager.connect(roomId); // そもそも 同じ instance を共有しているので connect する必要はない
			
			this.updateState({
				isConnected: true,
				roomId,
				userId,
				error: null,
			});

			// トーナメントルームにサブスクライブ
			this.wsManager.sendMessage({
				action: "subscribe_tournament",
				room_id: roomId,
				user_id: userId,
			});

			// メッセージハンドラーを登録
			this.wsManager.subscribe("*", (message: any) => {
				try {
					this.handleMessage(message as OutgoingMsg);
				} catch (error) {
					console.error("メッセージの解析に失敗しました:", error);
					this.updateState({ error: "メッセージの解析に失敗しました" });
				}
			});

			console.log("WebSocket接続が確立されました");
		} catch (error) {
			console.error("WebSocket接続エラー:", error);
			this.updateState({
				isConnected: false,
				error: "WebSocket接続エラー - バックエンドが起動しているか確認してください",
			});
			throw error;
		}
	}

	// メッセージを送信
	private sendMessage(message: IncomingMsg) {
		if (this.wsManager.isConnected()) {
			this.wsManager.sendMessage(message);
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
					error: null,
				});
				break;

			case "round_generated":
				console.log("次のラウンドが生成されました:", message);
				this.updateState({
					tournament: message.tournament,
					currentMatch: message.next_match,
					isLoading: false,
					error: null,
				});
				break;

			case "tournament_finished":
				console.log("トーナメントが終了しました:", message);
				this.updateState({
					tournament: message.tournament,
					currentMatch: null,
					isLoading: false,
					error: null,
				});
				break;

			case "next_match":
				console.log("次のマッチ情報:", message);
				this.updateState({
					currentMatch: message.next_match,
					isLoading: false,
					error: null,
				});
				break;

			case "error":
				console.error("サーバーエラー:", message.message);
				this.updateState({
					error: message.message,
					isLoading: false,
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
			participants,
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
			room_id: this.state.roomId,
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
			room_id: this.state.roomId,
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
			winner_id: winnerId,
		});
	}

	// 接続を切断
	disconnect() {
		// WebSocketの購読を解除
		this.wsManager.unsubscribe("*", (message: any) => {
			try {
				this.handleMessage(message as OutgoingMsg);
			} catch (error) {
				console.error("メッセージの解析に失敗しました:", error);
			}
		});
		
		this.updateState({
			isConnected: false,
			tournament: null,
			currentMatch: null,
		});
	}

	// 現在の状態を取得
	getState(): TournamentState {
		return { ...this.state };
	}
}
