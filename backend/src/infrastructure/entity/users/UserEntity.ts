import type {
	UserId,
	UserStatus,
} from "@domain/model/value-object/user/User.js";
import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryColumn,
	type Relation,
	UpdateDateColumn,
} from "typeorm";
import { RoomEntity } from "../rooms/RoomEntity.js";

@Entity("users")
export class UserEntity {
	@PrimaryColumn("text")
	id!: UserId;

	@Column("text", { unique: true })
	username!: string;

	@Column("text", { nullable: true })
	avatar_url!: string | null;

	@Column("text", { default: "offline" })
	status!: UserStatus;

	@Column("text")
	password_hash!: string;

	@ManyToOne(
		() => RoomEntity,
		(room) => room.participants,
		{ nullable: true, onDelete: "SET NULL" },
	)
	room!: Relation<RoomEntity | null>;

	@CreateDateColumn()
	created_at!: Date;

	@UpdateDateColumn()
	updated_at!: Date;

	@Column("text", { unique: true })
	email!: string;

	@Column({ default: false })
	twoFAEnabled!: boolean;

	@Column("text", { nullable: true })
	twoFASecret!: string | null;
}
