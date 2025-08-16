import type { Match } from "@domain/model/entity/match/Match.js";
import {
	Entity,
	PrimaryColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
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

	@Column("uuid")
	winnerId!: string | null;

	@Column("int")
	round!: number;

	@Column("uuid")
	tournamentId!: string;
}
