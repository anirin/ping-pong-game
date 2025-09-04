import {
	WebSocketManager,
	type WebSocketMessage,
} from "../../../shared/websocket/WebSocketManager";

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

	constructor() {
		this.wsManager.addCallback(this.handleMessage.bind(this));
	}

	// トーナメントメッセージの処理(受信)
	private handleMessage(message: WebSocketMessage): void {
		// TODO : 検討
		if (message.status !== "Tournament") {
			return;
		}

		if (message.data) {
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
		} else {
			console.error("Tournament data is null");
		}
	}

	// トーナメントデータの取得(送信)
	public getTournamentData(): void {
		console.log("TournamentAPI: トーナメントデータを要求");
		this.wsManager.sendMessage({
			status: "Tournament",
			action: "get_status",
		});
	}

	public destroy(): void {
		this.wsManager.removeCallback(this.handleMessage.bind(this));
		console.log("TournamentAPI: 破棄");
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
