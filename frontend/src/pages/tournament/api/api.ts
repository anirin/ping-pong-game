import {
	WebSocketManager,
	type WebSocketMessage,
} from "../../../shared/websocket/WebSocketManager";

export interface TournamentMatch {
	id: string;
	player1Id: string;
	player2Id: string;
	score1: number;
	score2: number;
	winnerId: string | null;
	status: string;
	round: number;
	player1Info?: {
		id: string;
		username: string;
		avatar: string | null;
	};
	player2Info?: {
		id: string;
		username: string;
		avatar: string | null;
	};
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
	private tournamentData: TournamentData | null = null;

	private wsManager: WebSocketManager = WebSocketManager.getInstance();
	private messageHandler: (message: WebSocketMessage) => void;
	private controllerCallback: ((data: any, action?: string) => void) | null =
		null;

	constructor() {
		this.messageHandler = this.handleMessage.bind(this);
		this.wsManager.setCallback(this.messageHandler);
	}

	// getter
	public getCurrentTournament(): TournamentData | null {
		return this.tournamentData;
	}

	public getMatch(index: number): TournamentMatch | null {
		if (!this.tournamentData || !this.tournamentData.matches) {
			return null;
		}
		return this.tournamentData.matches[index] || null;
	}

	// setter
	public setCallback(callback: (data: any, action?: string) => void): void {
		this.controllerCallback = callback;
	}

	public removeCallback(): void {
		this.controllerCallback = null;
	}

	// methods
	// 送信
	public getTournamentData(): void {
		this.wsManager.sendMessage({
			status: "Tournament",
			action: "get_status",
		});
	}

	// 送信
	public navigateToMatch(matchId: string): void {
		this.wsManager.sendMessage({
			status: "Tournament",
			action: "navigate_to_match",
			matchId: matchId,
		});
	}

	public destroy(): void {
		this.wsManager.removeCallback();
		this.controllerCallback = null;
		this.tournamentData = null;
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

		if (message.status === "Match" && message.data?.type === "match_finished") {
			// マッチ終了の通知
			if (this.controllerCallback) {
				this.controllerCallback(message.data, "match_finished");
			}
			return;
		}

		if (message.status !== "Tournament") {
			return;
		}

		if (message.data) {
			if ("type" in message.data && message.data.type === "navigate_to_match") {
				if (this.controllerCallback) {
					this.controllerCallback(message.data, "navigate_to_match");
				}
				return;
			}

			if (
				"type" in message.data &&
				message.data.type === "tournament_finished"
			) {
				if (this.controllerCallback) {
					this.controllerCallback(message.data, "tournament_finished");
				}
				return;
			}

			// トーナメントデータの受信
			this.tournamentData = message.data as TournamentData;

			if (this.controllerCallback) {
				this.controllerCallback(this.tournamentData, "data_update");
			}
		} else {
			console.error("Tournament data is null");
		}
	}
}
