import type { Match } from "@domain/model/entity/match/Match.js";
import type { MatchHistory } from "@domain/model/entity/match/MatchHistory.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export interface MatchRepository {
	findById(id: MatchId): Promise<Match | null>;
	save(match: Match): Promise<void>;
	saveAll(matches: Match[]): Promise<void>;
	update(match: Match): Promise<void>;
	findByTournamentId(tournamentId: TournamentId): Promise<Match[]>;
	findFinishedByUser(userId: UserId): Promise<MatchHistory[] | null>;
}
