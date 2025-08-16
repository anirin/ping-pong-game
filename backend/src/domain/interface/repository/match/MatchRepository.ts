import type { Match } from "@domain/model/entity/match/Match.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";

export interface MatchRepository {
	findById(id: MatchId): Promise<Match | null>;
	save(match: Match): Promise<void>;
	saveAll(matches: Match[]): Promise<void>;
	update(match: Match): Promise<void>;
}
