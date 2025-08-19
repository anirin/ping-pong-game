import type {
	MatchPosition,
	WSMatchData,
} from "@domain/model/value-object/match/Match.js";
import type { WSRoomData } from "@domain/model/value-object/room/Room.js";
import type { WSTournamentData } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export type WSIncomingMsg =
	| {
			status: "Room";
			action: "START" | "DELETE";
	  }
	| {
			status: "User";
			action: "ADD" | "DELETE";
			user: UserId;
	  }
	| {
			status: "Match";
			action: "Move";
			msg: MatchPosition;
	  };

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
