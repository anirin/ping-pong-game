// frontend/src/ws-types.ts (新規作成)

type RoomId = string;
type MatchPosition = "UP" | "DOWN" | "STAY";

// --- クライアント → サーバー ---
export type WSIncomingMsg =
	| {
			status: "Room";
			action: "START" | "DELETE";
	  }
	| {
			status: "User";
			action: "ADD" | "DELETE";
			room: RoomId;
	  }
	| {
			status: "Match";
			action: "Move";
			msg: MatchPosition;
	  };

// --- サーバー → クライアント ---
// RoomUserの型は `types.ts` からインポートすることを想定
import type { RoomUser } from "./types";

export interface WSRoomData {
	action: "USER" | "DELETE";
	users: RoomUser[];
}
// TODO: WSTournamentData, WSMatchData の型もここに追加する

export type WSOutgoingMsg =
	| {
			status: "error";
			msg: string;
	  }
	| {
			status: "Room";
			data: WSRoomData;
	  };
// TODO: Tournament, Match の型もここに追加
// | { status: "Tournament"; data: WSTournamentData; }
// | { status: "Match"; data: WSMatchData; };
