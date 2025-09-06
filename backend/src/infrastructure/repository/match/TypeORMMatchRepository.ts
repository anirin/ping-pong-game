import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import { Match } from "@domain/model/entity/match/Match.js";
import { MatchHistory } from "@domain/model/entity/match/MatchHistory.js";
import type {
	MatchId,
	MatchStatus,
} from "@domain/model/value-object/match/Match.js";
import { MatchRule } from "@domain/model/value-object/match/Match.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { MatchEntity } from "@infrastructure/entity/match/MatchEntity.js";
import { UserEntity } from "@infrastructure/entity/users/UserEntity.js";
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
		const matchRule = new MatchRule(
			4, // pointToWin: 勝利ポイントを5に変更
			{ vx: 1.5, vy: 1.5 }, // initialBallSpeed: ボールスピードを半分に（3→1.5）
			{ width: 800, height: 600 }, // fieldSize: デフォルト値
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

	async findFinishedByUser(userId: UserId): Promise<MatchHistory[] | null> {
		const rows = await this.repository
			.createQueryBuilder("m")
			.leftJoin(UserEntity, "u1", "u1.id = m.player1")
			.leftJoin(UserEntity, "u2", "u2.id = m.player2")
			.where("m.player1 = :uid OR m.player2 = :uid", { uid: userId })
			.andWhere("m.status = :status", { status: "finished" })
			.select([
				"m.id AS id",
				"m.player1 AS player1Id",
				"m.player2 AS player2Id",
				"m.score1 AS score1",
				"m.score2 AS score2",
				"m.status AS status",
				"m.winnerId AS winnerId",
				`CASE WHEN m.player1 = :uid THEN u2.id ELSE u1.id END AS opponentId`,
				`CASE WHEN m.player1 = :uid THEN u2.username ELSE u1.username END AS opponentName`,
				`CASE WHEN m.player1 = :uid THEN u2.avatar_url ELSE u1.avatar_url END AS opponentAvatarUrl`,
			])
			.setParameter("uid", userId)
			.orderBy("m.id", "DESC")
			.getRawMany();

		return rows.map((r: any) => MatchHistory.fromRaw(r, String(userId)));
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
