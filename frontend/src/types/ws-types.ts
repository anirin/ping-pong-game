// frontend/src/types/ws-types.ts (修正版)

type MatchPosition = { y: number };

// --- クライアント → サーバー ---
export type WSIncomingMsg =
	| {
			status: "Room";
			action: "START" | "DELETE" | "LEAVE";
	  }
	| {
			status: "Match";
			action: "start";
			matchId: string;
	  }
	| {
			status: "Match";
			action: "move";
			matchId: string;
			data: MatchPosition;
	  };

// --- サーバー → クライアント ---
import type { RoomUser } from "./types"; // './types' は実際のパスに合わせてください

export interface WSRoomData {
	action: "USER" | "DELETE" | "START";
	users: RoomUser[];
	// ★ roomInfoプロパティをオプショナルで追加
	roomInfo?: {
		id: string;
		ownerId: string;
		status: string;
	};
}

// マッチデータの型定義を追加
export interface WSMatchData {
	type: "match_state" | "match_started" | "match_finished" | "none" | "error";
	matchId?: string;
	state?: {
		status: string;
		ball: { x: number; y: number };
		paddles: {
			player1: { id: string; y: number };
			player2: { id: string; y: number };
		};
		scores: {
			player1: number;
			player2: number;
		};
	};
	winnerId?: string;
	message?: string;
}

export type WSTournamentData = {};

export type WSOutgoingMsg =
	| {
			status: "error";
			msg: string;
	  }
	| {
			status: "Room";
			data: WSRoomData;
	  }
	| {
			status: "Tournament";
			data: WSTournamentData;
	  }
	| {
			status: "Match";
			data: WSMatchData;
	  };
