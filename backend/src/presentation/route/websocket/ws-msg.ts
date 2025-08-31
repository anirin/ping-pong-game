import type {
	RoomId,
	WSRoomData,
} from "@domain/model/value-object/room/Room.js";
import type { MatchIncomingMsg, MatchOutgoingMsg } from "../match/match-msg.js";
import type {
	TournamentOutgoingMsg,
} from "../tournament/tournament-msg.js";

// todo incoming はそれぞれの route/xxx に 持たせる方が良い
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
	| MatchIncomingMsg;

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
			status: "Room"; // tournament に渡すので意味のない action を書いている
			msg: string;
	  }
	| MatchOutgoingMsg
	| TournamentOutgoingMsg;
