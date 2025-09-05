import type { WSTournamentData } from "@domain/model/value-object/tournament/Tournament.js";

export type TournamentIncomingMsg = {
	status: "Tournament";
	action: "get_status";
};

export type TournamentOutgoingMsg = {
	status: "Tournament";
	data: WSTournamentData;
};
