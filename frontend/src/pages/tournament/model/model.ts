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
	| { type: "tournament_started"; tournament: TournamentDTO; next_match: MatchDTO | null }
	| { type: "round_generated"; tournament: TournamentDTO; next_match: MatchDTO | null }
	| { type: "tournament_finished"; tournament: TournamentDTO }
	| { type: "error"; message: string }
	| { type: "next_match"; next_match: MatchDTO | null };

// DTO型定義
export interface MatchDTO {
	id: string;
	player1_id: string;
	player2_id: string;
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