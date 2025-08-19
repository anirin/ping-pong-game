import type {
	UserId,
	UserStatus,
} from "@domain/model/value-object/user/User.js";
import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { RoomParticipantEntity } from "../rooms/RoomParticipantEntity.js";

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

	@OneToMany(
		() => RoomParticipantEntity,
		(middle) => middle.user,
		{ cascade: true },
	)
	room_participant!: RoomParticipantEntity[];

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
