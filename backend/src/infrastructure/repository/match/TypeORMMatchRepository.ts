import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import { Match } from "@domain/model/entity/match/Match.js";
import { MatchRule } from "@domain/model/value-object/match/Match.js";
import type { MatchId, MatchStatus } from "@domain/model/value-object/match/Match.js";
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
		// TypeORMのupdateは第一引数にID、第二引数に更新内容を渡す
		await this.repository.update(match.id, entity);
	}

	async findByTournamentId(tournamentId: TournamentId): Promise<Match[]> {
		const entities = await this.repository.find({ where: { tournamentId } });
		return entities.map((entity) => this.toDomain(entity));
	}

	private toDomain(entity: MatchEntity): Match {
		const matchRule = new MatchRule(
			2, // pointToWin: 本来はDBから取得するか、設定ファイルから読み込むべき
			{ vx: 7, vy: 7 }, // initialBallSpeed: デフォルト値
			{ width: 800, height: 600 } // fieldSize: デフォルト値
		);

		// Match.reconstitute静的メソッドを使って、安全にドメインエンティティを復元
		return Match.reconstitute({
            id: entity.id,
            tournamentId: entity.tournamentId,
            player1Id: entity.player1,
            player2Id: entity.player2,
            round: entity.round,
            rule: matchRule,
            status: entity.status as MatchStatus,
            score1: entity.score1,
            score2: entity.score2,
            winnerId: entity.winnerId,
        });
	}

	/**
	 * ドメインエンティティからデータベースエンティティへ変換する
	 */
	private toEntity(match: Match): MatchEntity {
		const entity = new MatchEntity();

		entity.id = match.id;
		entity.tournamentId = match.tournamentId;
		entity.player1 = match.player1Id;
		entity.player2 = match.player2Id;
		entity.round = match.round;

		// publicなゲッターを通じて、安全にプロパティを取得
		entity.score1 = match.score1;
		entity.score2 = match.score2;
		entity.status = match.status;
		entity.winnerId = match.winnerId;

		return entity;
	}
}