import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import { Match, MatchRule } from "@domain/model/entity/match/Match.js";
import type {
	MatchId,
	MatchStatus,
} from "@domain/model/value-object/match/Match.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import { MatchEntity } from "@infrastructure/entity/match/MatchEntity.js";
import type { Repository } from "typeorm";

export class TypeORMMatchRepository implements MatchRepository {
	constructor(private readonly repository: Repository<MatchEntity>) {}

	async findById(id: MatchId): Promise<Match | null> {
		const entity = await this.repository.findOne({ where: { id } });
		if (!entity) return null;
		return this.toDomain(entity);
	}

	async save(match: Match): Promise<void> {
		const entity = this.toEntity(match);
		await this.repository.save(entity);
	}

	async saveAll(matches: Match[]): Promise<void> {
		const entities = matches.map((match) => this.toEntity(match));
		await this.repository.save(entities);
	}

	async update(match: Match): Promise<void> {
		const entity = this.toEntity(match);
		await this.repository.update(match.id, entity);
	}

	async findByTournamentId(tournamentId: TournamentId): Promise<Match[]> {
		const entities = await this.repository.find({ where: { tournamentId } });
		return entities.map((entity) => this.toDomain(entity));
	}

	private toDomain(entity: MatchEntity): Match {
		const matchRule = new MatchRule(2);

		const match = new Match(
			entity.id,
			entity.player1,
			entity.player2,
			matchRule,
			entity.round,
			entity.tournamentId,
		);

		match.score1 = entity.score1;
		match.score2 = entity.score2;
		match.status = entity.status as MatchStatus;
		match.winnerId = entity.winnerId;
		match.round = entity.round;
		match.tournamentId = entity.tournamentId;

		return match;
	}

	private toEntity(match: Match): MatchEntity {
		const entity = new MatchEntity();

		entity.id = match.id;
		entity.player1 = match.player1;
		entity.player2 = match.player2;
		entity.score1 = match.score1;
		entity.score2 = match.score2;
		entity.status = match.status;
		entity.winnerId = match.winnerId;
		entity.round = match.round;
		entity.tournamentId = match.tournamentId;

		return entity;
	}
}
