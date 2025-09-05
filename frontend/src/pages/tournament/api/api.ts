import {
	WebSocketManager,
	type WebSocketMessage,
} from "../../../shared/websocket/WebSocketManager";
import { navigate } from "../../../app/routing/index.js";

export interface TournamentMatch {
	id: string;
	player1Id: string;
	player2Id: string;
	score1: number;
	score2: number;
	winnerId: string | null;
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

export interface TournamentMessage extends WebSocketMessage {
	status: "Tournament";
	action: "get_status";
	data: TournamentData;
}

export class TournamentAPI {
	private static instance: TournamentAPI | null = null;
	private tournamentData: TournamentData | null = null;

	private match1: TournamentMatch | null = null;
	private match2: TournamentMatch | null = null;
	private match3: TournamentMatch | null = null;

	private wsManager: WebSocketManager = WebSocketManager.getInstance();
	private messageHandler: (message: WebSocketMessage) => void;
	private dataUpdateCallbacks: Set<() => void> = new Set();
	private isInitialized: boolean = false;

	private constructor() {
		this.messageHandler = this.handleMessage.bind(this);
	}

	public static getInstance(): TournamentAPI {
		if (!TournamentAPI.instance) {
			TournamentAPI.instance = new TournamentAPI();
		}
		return TournamentAPI.instance;
	}

	public initialize(): void {
		if (this.isInitialized) {
			console.warn("TournamentAPI is already initialized");
			return;
		}
		this.wsManager.addCallback(this.messageHandler);
		this.isInitialized = true;
		console.log("TournamentAPI initialized");
	}

	private handleMessage(message: WebSocketMessage): void {
		if (message.status !== "Tournament") {
			return;
		}

		if (message.data) {
			if ('type' in message.data && message.data.type === "navigate_to_match") {
				// 遷移前にコールバックをクリアして重複を防ぐ
				this.wsManager.clearCallbacks();
				navigate(`/match/${message.data.matchId}`);
				return;
			}

			if ('type' in message.data && message.data.type === "tournament_finished") {
				console.log("Tournament finished, winner:", message.data.winner_id);
				this.handleTournamentFinished(message.data.winner_id, message.data.tournament_id);
				return;
			}

			this.tournamentData = message.data as TournamentData;
			console.log("Frontend received tournament data:", JSON.stringify(message.data, null, 2));

			this.match1 = this.tournamentData.matches[0];
			this.match2 = this.tournamentData.matches[1];
			if (this.tournamentData.matches.length > 2) {
				this.match3 = this.tournamentData.matches[2];
			}

			this.notifyDataUpdate();
		} else {
			console.error("Tournament data is null");
		}
	}

	private handleTournamentFinished(winnerId: string, _tournamentId: string): void {
		this.showTournamentWinner(winnerId);
		
		const wsManager = WebSocketManager.getInstance();
		wsManager.reset();
		
		setTimeout(() => {
			navigate("/room");
		}, 3000);
	}

	private showTournamentWinner(winnerId: string): void {
		const winnerModal = document.createElement("div");
		winnerModal.className = "tournament-winner-modal";
		winnerModal.innerHTML = `
			<div class="winner-content">
				<h1>🏆 トーナメント終了 🏆</h1>
				<h2>優勝者: ${winnerId}</h2>
				<p>3秒後にルームページに戻ります...</p>
			</div>
		`;
		
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
		
		setTimeout(() => {
			if (winnerModal.parentNode) {
				winnerModal.parentNode.removeChild(winnerModal);
			}
		}, 3000);
	}

	public getTournamentData(): void {
		console.log("TournamentAPI: トーナメントデータを要求");
		
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
		// サーバーからの応答を受信するためにコールバックをクリアしない
		this.wsManager.sendMessage({
			status: "Tournament",
			action: "navigate_to_match",
			matchId: matchId,
		});
	}

	public destroy(): void {
		if (!this.isInitialized) {
			console.warn("TournamentAPI is not initialized");
			return;
		}
		this.wsManager.removeCallback(this.messageHandler);
		this.dataUpdateCallbacks.clear();
		this.tournamentData = null;
		this.match1 = null;
		this.match2 = null;
		this.match3 = null;
		this.isInitialized = false;
		console.log("TournamentAPI destroyed");
	}

	public reset(): void {
		console.log("TournamentAPI: リセット開始");
		this.destroy();
		this.initialize();
		console.log("TournamentAPI: リセット完了");
	}

	public static reset(): void {
		if (TournamentAPI.instance) {
			TournamentAPI.instance.destroy();
			TournamentAPI.instance = null;
		}
	}

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

// シングルトンインスタンスの取得関数
export function getTournamentAPI(): TournamentAPI {
	return TournamentAPI.getInstance();
}
