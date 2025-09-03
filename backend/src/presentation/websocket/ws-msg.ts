import type { RoomIncomingMsg, RoomOutgoingMsg } from "./room/room-msg.js";
import type { UserIncomingMsg, UserOutgoingMsg } from "./user/user-msg.js";
import type { MatchIncomingMsg, MatchOutgoingMsg } from "./match/match-msg.js";
import type { TournamentOutgoingMsg } from "./tournament/tournament-msg.js";

export type WSOutgoingMsgError = {
	status: "error";
	msg: string;
};

export type WSIncomingMsg =
| RoomIncomingMsg
| UserIncomingMsg
| MatchIncomingMsg

export type WSOutgoingMsg =
| RoomOutgoingMsg
| UserOutgoingMsg
| MatchOutgoingMsg
| TournamentOutgoingMsg
| WSOutgoingMsgError
