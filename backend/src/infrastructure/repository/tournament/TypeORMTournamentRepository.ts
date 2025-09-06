import type { TournamentRepository } from "@domain/interface/repository/tournament/TournamentRepository.js";
import { Tournament } from "@domain/model/entity/tournament/Tournament.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import { TournamentEntity } from "@infrastructure/entity/tournament/TournamentEntity.js";
import type { Repository } from "typeorm";

export class TypeORMTournamentRepository implements TournamentRepository {
	constructor(private readonly repository: Repository<TournamentEntity>) {}

	async findById(id: TournamentId): Promise<Tournament | null> {
		const entity = await this.repository.findOne({ where: { id } });
		if (!entity) return null;
		return this.toDomain(entity);
	}

	async findByRoomId(roomId: RoomId): Promise<Tournament | null> {
		const entity = await this.repository.findOne({
			where: { room_id: roomId },
		});
		if (!entity) return null;
		return this.toDomain(entity);
	}

	async save(tournament: Tournament): Promise<void> {
		const entity = this.toEntity(tournament);
		await this.repository.save(entity);
	}

	async update(tournament: Tournament): Promise<void> {
		const entity = this.toEntity(tournament);
		await this.repository.update(tournament.id, entity);
	}

	private toDomain(entity: TournamentEntity): Tournament {
		const id = entity.id;
		const createdBy = entity.created_by;
		const roomId = entity.room_id;
		const tournament = new Tournament(id, [], createdBy, roomId);

		// エンティティからドメインオブジェクトに値を設定
		tournament.status = entity.status as any;
		tournament.currentRound = entity.current_round;
		tournament.winner_id = entity.winner_id;
		tournament.type = entity.type as any;

		// todo userid と matchesはapplication or domain にて取得
		return tournament;
	}

	private toEntity(tournament: Tournament): TournamentEntity {
		const entity = new TournamentEntity();
		entity.id = tournament.id;
		entity.status = tournament.status;
		entity.current_round = tournament.currentRound;
		entity.winner_id = tournament.winner_id ?? null;
		entity.created_by = tournament.createdBy;
		entity.type = tournament.type;
		entity.room_id = tournament.room_id;
		entity.created_at = new Date(); //仮で入れます
		entity.updated_at = new Date();

		return entity;
	}
}
