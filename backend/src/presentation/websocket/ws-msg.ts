import type { MatchIncomingMsg, MatchOutgoingMsg } from "./match/match-msg.js";
import type { RoomIncomingMsg, RoomOutgoingMsg } from "./room/room-msg.js";
import type {
	TournamentIncomingMsg,
	TournamentOutgoingMsg,
} from "./tournament/tournament-msg.js";
import type { UserIncomingMsg } from "./user/user-msg.js";

export type WSOutgoingMsgError = {
	status: "error";
	msg: string;
};

export type WSIncomingMsg =
	| RoomIncomingMsg
	| UserIncomingMsg
	| MatchIncomingMsg
	| TournamentIncomingMsg;

export type WSOutgoingMsg =
	| RoomOutgoingMsg
	| MatchOutgoingMsg
	| TournamentOutgoingMsg
	| WSOutgoingMsgError;
