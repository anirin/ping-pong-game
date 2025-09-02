// import type { Tournament } from "@domain/model/entity/tournament/Tournament.js";
import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity("Tournament")
export class TournamentEntity {
	@PrimaryColumn("uuid", { default: () => "gen_random_uuid()" })
	id!: string;

	@Column("text", { nullable: true })
	name!: string;

	@Column("uuid")
	room_id!: string;

	@Column("text", { default: "1on1" })
	type!: string;

	@Column("text", { default: "waiting" })
	status!: string;

	@Column("int", { default: 1 })
	current_round!: number;

	@Column("uuid", { nullable: true })
	winner_id!: string | null;

	@Column("uuid")
	created_by!: string;

	@CreateDateColumn()
	created_at!: Date;

	@UpdateDateColumn()
	updated_at!: Date;
}
