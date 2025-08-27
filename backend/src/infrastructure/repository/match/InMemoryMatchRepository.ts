import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import type { Match } from "@domain/model/entity/match/Match.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";

export class InMemoryMatchRepository implements MatchRepository {
	private matches: Map<MatchId, Match> = new Map();

	async findById(id: MatchId): Promise<Match | null> {
		const match = this.matches.get(id);
		return match ?? null;
	}

	async save(match: Match): Promise<void> {
		this.matches.set(match.id, match);
	}

	async saveAll(matches: Match[]): Promise<void> {
		for (const match of matches) {
			this.matches.set(match.id, match);
		}
	}

	async update(match: Match): Promise<void> {
		if (!this.matches.has(match.id)) {
			throw new Error(`Match with id ${match.id} not found for update.`);
		}
		this.matches.set(match.id, match);
	}

	async findByTournamentId(tournamentId: TournamentId): Promise<Match[]> {
		const result: Match[] = [];
		for (const match of this.matches.values()) {
			if (match.tournamentId === tournamentId) {
				result.push(match);
			}
		}
		return result;
	}
}
