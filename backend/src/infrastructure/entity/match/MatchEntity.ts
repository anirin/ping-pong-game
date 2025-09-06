import type { Match } from "@domain/model/entity/match/Match.js";
import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
	// UpdateDateColumn,
} from "typeorm";

@Entity("Match")
export class MatchEntity {
	@PrimaryColumn("uuid", { default: () => "gen_random_uuid()" })
	id!: string;

	@Column("uuid")
	player1!: string;

	@Column("uuid")
	player2!: string;

	@Column("int")
	score1!: number;

	@Column("int")
	score2!: number;

	@Column("text")
	status!: string;

	@Column("uuid", { nullable: true })
	winnerId!: string | null;

	@Column("int")
	round!: number;

	@Column("uuid")
	tournamentId!: string;

	@CreateDateColumn()
	created_at!: Date;
}
