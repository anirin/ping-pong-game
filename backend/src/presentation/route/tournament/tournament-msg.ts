import type { Match } from "@domain/model/entity/match/Match.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export type TournamentOutgoingMsg =
	| {
			status: "Tournament";
			action: "tournament_status";
			data: {
				type: "tournament_status";
				tournament_id: TournamentId;
				room_id: RoomId; // context にあるからいらないはず
				participants: UserId[];
				matches: Match[];
				next_match_id: MatchId | null;
				current_round: number;
			};
	  }
	| {
			status: "Tournament";
			action: "tournament_finished";
			data: {
				type: "tournament_finished";
				tournament_id: TournamentId;
				winner_id: UserId;
			};
	  }
	| {
			status: "Tournament";
			action: "error";
			data: {
				type: "error";
				message: string;
			};
	  };
