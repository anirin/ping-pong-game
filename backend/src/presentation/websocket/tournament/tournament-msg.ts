import type { WSTournamentData } from "@domain/model/value-object/tournament/Tournament.js";

export type TournamentOutgoingMsg = {
	status: "Tournament";
	data: WSTournamentData;
};