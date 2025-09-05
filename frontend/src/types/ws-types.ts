// frontend/src/types/ws-types.ts (修正版)

type MatchPosition = "UP" | "DOWN" | "STAY";

// --- クライアント → サーバー ---
export type WSIncomingMsg =
	| {
			status: "Room";
			action: "START" | "DELETE";
	  }
	// | {  // ← 'User'ステータスのメッセージは不要になったので削除
	// 		status: "User";
	// 		action: "ADD" | "DELETE";
	// 		room: RoomId;
	//   }
	| {
			status: "Match";
			action: "Move";
			msg: MatchPosition;
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

// TODO: WSTournamentData, WSMatchData の型定義もここに追加する
export type WSTournamentData = {};
export type WSMatchData = {};

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
