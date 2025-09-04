import type { WSTournamentData } from "@domain/model/value-object/tournament/Tournament.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";

export type TournamentIncomingMsg = 
	| {
			status: "Tournament";
			action: "get_status";
	  }
	| {
			status: "Tournament";
			action: "navigate_to_match";
			matchId: MatchId;
	  };

export type TournamentOutgoingMsg = 
	| {
			status: "Tournament";
			data: WSTournamentData;
	  }
	| {
			status: "Tournament";
			data: {
				type: "navigate_to_match";
				matchId: MatchId;
			};
	  };
