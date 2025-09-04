import type { FriendStatus } from "@domain/model/value-object/friend/Friend.js";
import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity("friends")
export class FriendEntity {
	@PrimaryColumn("text")
	id!: string;

	@Column("text")
	user_id!: string;

	@Column("text")
	friend_id!: string;

	@Column("text")
	status!: FriendStatus;

	@CreateDateColumn({ type: "text", nullable: true })
	requested_at!: Date;

	@Column({ type: "text", nullable: true })
	accepted_at!: Date | null;

	@Column({ type: "text", nullable: true })
	blocked_at!: Date | null;
}
