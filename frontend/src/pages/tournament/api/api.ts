import {
	WebSocketManager,
	type WebSocketMessage,
} from "../../../shared/websocket/WebSocketManager";
import { navigate } from "../../../app/routing/index.js";

// トーナメント関連の型定義
export interface TournamentMatch {
	id: string;
	player1Id: string; // player1_id → player1Id に修正
	player2Id: string; // player2_id → player2Id に修正
	score1: number;
	score2: number;
	winnerId: string | null; // winner_id → winnerId に修正
	status: string;
	round: number;
}
export interface TournamentData {
	status: string;
	next_match_id: string;
	matches: TournamentMatch[];
	current_round: number;
	winner_id: string | null;
}

// トーナメント専用のメッセージ型
export interface TournamentMessage extends WebSocketMessage {
	status: "Tournament";
	action: "get_status";
	data: TournamentData;
}

export class TournamentAPI {
	private tournamentData: TournamentData | null = null;

	// data類 api に置くのは適切でない
	private match1: TournamentMatch | null = null; // round1
	private match2: TournamentMatch | null = null; // round1
	private match3: TournamentMatch | null = null; // rooud2 （決勝）

	// todo : avator 含め定義する backend も調整必要 (最後)
	// private player1: Player | null = null;
	// private player2: Player | null = null;
	// private player3: Player | null = null;
	// private player4: Player | null = null;

	private wsManager: WebSocketManager = WebSocketManager.getInstance();
	private messageHandler: (message: WebSocketMessage) => void;
	private dataUpdateCallbacks: Set<() => void> = new Set();

	constructor() {
		// メッセージハンドラーをプロパティとして保存
		this.messageHandler = this.handleMessage.bind(this);
		this.wsManager.addCallback(this.messageHandler);
	}

	// トーナメントメッセージの処理(受信)
	private handleMessage(message: WebSocketMessage): void {
		// TODO : 検討
		if (message.status !== "Tournament") {
			return;
		}

		if (message.data) {
			// navigate_to_matchメッセージの処理
			if ('type' in message.data && message.data.type === "navigate_to_match") {
				navigate(`/match/${message.data.matchId}`);
				return;
			}

			// tournament_finishedメッセージの処理
			if ('type' in message.data && message.data.type === "tournament_finished") {
				console.log("Tournament finished, winner:", message.data.winner_id);
				// トーナメント終了時の処理（勝利者表示、ルームページへの遷移など）
				this.handleTournamentFinished(message.data.winner_id, message.data.tournament_id);
				return;
			}

			// 通常のトーナメントデータの処理
			this.tournamentData = message.data as TournamentData;

			// デバッグ用ログを追加
			console.log(
				"Frontend received tournament data:",
				JSON.stringify(message.data, null, 2),
			);

			// match1, match2, match3 を更新
			this.match1 = this.tournamentData.matches[0];
			this.match2 = this.tournamentData.matches[1];
			// match3 はない場合がある
			if (this.tournamentData.matches.length > 2) {
				this.match3 = this.tournamentData.matches[2];
			}

			// データ更新を通知
			this.notifyDataUpdate();
		} else {
			console.error("Tournament data is null");
		}
	}

	// トーナメント終了時の処理
	private handleTournamentFinished(winnerId: string, tournamentId: string): void {
		// 勝利者情報を表示
		this.showTournamentWinner(winnerId);
		
		// 3秒後にルームページに遷移
		setTimeout(() => {
			navigate("/room");
		}, 3000);
	}

	// 勝利者表示
	private showTournamentWinner(winnerId: string): void {
		// 勝利者表示のモーダルまたはメッセージを表示
		const winnerModal = document.createElement("div");
		winnerModal.className = "tournament-winner-modal";
		winnerModal.innerHTML = `
			<div class="winner-content">
				<h1>🏆 トーナメント終了 🏆</h1>
				<h2>優勝者: ${winnerId}</h2>
				<p>3秒後にルームページに戻ります...</p>
			</div>
		`;
		
		// スタイルを追加
		winnerModal.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.8);
			display: flex;
			justify-content: center;
			align-items: center;
			z-index: 1000;
		`;
		
		const content = winnerModal.querySelector('.winner-content') as HTMLElement;
		if (content) {
			content.style.cssText = `
				background: white;
				padding: 2rem;
				border-radius: 10px;
				text-align: center;
				box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
			`;
		}
		
		document.body.appendChild(winnerModal);
		
		// 3秒後にモーダルを削除
		setTimeout(() => {
			if (winnerModal.parentNode) {
				winnerModal.parentNode.removeChild(winnerModal);
			}
		}, 3000);
	}

	// トーナメントデータの取得(送信)
	public getTournamentData(): void {
		console.log("TournamentAPI: トーナメントデータを要求");
		
		// WebSocket接続状態を確認
		if (!this.wsManager.isConnected()) {
			console.warn("WebSocket is not connected, cannot request tournament data");
			return;
		}
		
		this.wsManager.sendMessage({
			status: "Tournament",
			action: "get_status",
		});
	}

	public navigateToMatch(matchId: string): void {
		console.log("TournamentAPI: マッチに遷移", matchId);
		this.wsManager.sendMessage({
			status: "Tournament",
			action: "navigate_to_match",
			matchId: matchId,
		});
	}

	public destroy(): void {
		this.wsManager.removeCallback(this.messageHandler);
		this.dataUpdateCallbacks.clear();
		// データをリセット
		this.tournamentData = null;
		this.match1 = null;
		this.match2 = null;
		this.match3 = null;
		console.log("TournamentAPI: 破棄");
	}

	// データをリセットして新しいコールバックを登録
	public reset(): void {
		console.log("TournamentAPI: リセット開始");
		// 既存のコールバックを削除
		this.wsManager.removeCallback(this.messageHandler);
		this.dataUpdateCallbacks.clear();
		
		// データをリセット
		this.tournamentData = null;
		this.match1 = null;
		this.match2 = null;
		this.match3 = null;
		
		// 新しいメッセージハンドラーを作成
		this.messageHandler = this.handleMessage.bind(this);
		this.wsManager.addCallback(this.messageHandler);
		console.log("TournamentAPI: リセット完了");
	}

	// データ更新のコールバック管理
	public addDataUpdateCallback(callback: () => void): void {
		this.dataUpdateCallbacks.add(callback);
	}

	public removeDataUpdateCallback(callback: () => void): void {
		this.dataUpdateCallbacks.delete(callback);
	}

	private notifyDataUpdate(): void {
		this.dataUpdateCallbacks.forEach(callback => {
			try {
				callback();
			} catch (error) {
				console.error("Data update callback error:", error);
			}
		});
	}

	// データ取得メソッド : frontend用 : apiと関係はないので置き場所検討
	public getCurrentTournament(): TournamentData | null {
		return this.tournamentData;
	}
	public getMatch1(): TournamentMatch | null {
		return this.match1;
	}
	public getMatch2(): TournamentMatch | null {
		return this.match2;
	}
	public getMatch3(): TournamentMatch | null {
		return this.match3;
	}
}

export const tournamentAPI = new TournamentAPI();
