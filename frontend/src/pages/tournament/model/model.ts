// バックエンドのWebSocketメッセージ型に合わせた型定義

export type RoomId = string;
export type TournamentId = string;
export type UserId = string;

// 送信メッセージの型定義
export type IncomingMsg =
	| { action: "subscribe"; room_id: RoomId; user_id: UserId }
	| {
			action: "start_tournament";
			room_id: RoomId;
			created_by: UserId;
			participants: UserId[];
	  }
	| { action: "next_round"; tournament_id: TournamentId; room_id: RoomId }
	| {
			action: "finish_tournament";
			tournament_id: TournamentId;
			room_id: RoomId;
			winner_id: UserId;
	  }
	| {
			action: "get_next_match";
			tournament_id: TournamentId;
			room_id: RoomId;
	  };

// 受信メッセージの型定義
export type OutgoingMsg =
	| { type: "subscribed"; room_id: RoomId; user_id: UserId }
	| {
			type: "tournament_started";
			tournament: TournamentDTO;
			next_match: MatchDTO | null;
	  }
	| {
			type: "round_generated";
			tournament: TournamentDTO;
			next_match: MatchDTO | null;
	  }
	| { type: "tournament_finished"; tournament: TournamentDTO }
	| { type: "error"; message: string }
	| { type: "next_match"; next_match: MatchDTO | null };

// DTO型定義
export interface MatchDTO {
	id: string;
	player1_id: string;
	player2_id: string;
	player1_name: string;
	player2_name: string;
	score1: number;
	score2: number;
	status: string;
	round: number;
	winner_id: string | null;
}

export interface TournamentDTO {
	id: string;
	status: string;
	currentRound: number;
	winner_id: string | null;
	participants: string[];
	matches: MatchDTO[];
}

// トーナメント状態管理
export interface TournamentState {
	tournament: TournamentDTO | null;
	currentMatch: MatchDTO | null;
	participants: UserId[];
	roomId: RoomId | null;
	userId: UserId | null;
	isConnected: boolean;
	isLoading: boolean;
	error: string | null;
}

// 初期状態
export const initialTournamentState: TournamentState = {
	tournament: null,
	currentMatch: null,
	participants: [],
	roomId: null,
	userId: null,
	isConnected: false,
	isLoading: false,
	error: null,
};

// TournamentModel - APIとの通信と状態管理を担当
export class TournamentModel {
	private state: TournamentState;
	private onStateChange: ((state: TournamentState) => void) | null = null;
	private api: any; // TournamentWebSocketAPIのインスタンス

	constructor(api: any) {
		this.state = { ...initialTournamentState };
		this.api = api;
		this.setupApiCallbacks();
	}

	// 状態変更のコールバックを設定
	setStateChangeCallback(callback: (state: TournamentState) => void) {
		this.onStateChange = callback;
	}

	// 現在の状態を取得
	getState(): TournamentState {
		return { ...this.state };
	}

	// 状態を更新
	private updateState(updates: Partial<TournamentState>) {
		this.state = { ...this.state, ...updates };
		if (this.onStateChange) {
			this.onStateChange(this.state);
		}
	}

	// APIのコールバックを設定
	private setupApiCallbacks() {
		this.api.setStateChangeCallback((apiState: TournamentState) => {
			this.updateState(apiState);
		});
	}

	// トーナメント開始（subscribe → tournament start の流れ）
	async startTournament(
		participants: UserId[],
		roomId: RoomId,
		userId: UserId,
	): Promise<void> {
		try {
			this.updateState({
				isLoading: true,
				error: null,
				participants,
				roomId,
				userId,
			});

			// 1. WebSocket接続を確立
			await this.api.connect(roomId, userId);

			// 2. 接続が確立されたら、トーナメント開始メッセージを送信
			// APIのconnectメソッド内でsubscribeが自動的に送信される
			// その後、tournament startメッセージを送信
			this.api.startTournament(participants, userId);
		} catch (error) {
			this.updateState({
				isLoading: false,
				error:
					error instanceof Error
						? error.message
						: "トーナメント開始に失敗しました",
			});
			throw error;
		}
	}

	// 接続状態を取得
	isConnected(): boolean {
		return this.state.isConnected;
	}

	// エラー状態を取得
	getError(): string | null {
		return this.state.error;
	}

	// 現在のマッチを取得
	getCurrentMatch(): MatchDTO | null {
		return this.state.currentMatch;
	}

	// トーナメント情報を取得
	getTournament(): TournamentDTO | null {
		return this.state.tournament;
	}

	// 参加者リストを取得
	getParticipants(): UserId[] {
		return this.state.participants;
	}

	// ローディング状態を取得
	isLoading(): boolean {
		return this.state.isLoading;
	}
}
