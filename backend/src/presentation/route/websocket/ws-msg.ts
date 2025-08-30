import type {
	MatchPosition,
	WSMatchData,
} from "@domain/model/value-object/match/Match.js";
import type {
	RoomId,
	WSRoomData,
} from "@domain/model/value-object/room/Room.js";
import type { WSTournamentData } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type {
	TournamentIncomingMsg,
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
	| {
			status: "Match";
			action: "Move";
			msg: MatchPosition;
	  }
	| TournamentIncomingMsg;

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
			status: "Match";
			data: WSMatchData;
	  }
	| {
			status: "Tournament";
			data: WSTournamentData;
	  }
	| TournamentOutgoingMsg;
