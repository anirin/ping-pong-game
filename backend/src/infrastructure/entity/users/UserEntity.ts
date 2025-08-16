import type { UserStatus } from "@domain/model/value-object/user/User.js";
import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class UserEntity {
	@PrimaryColumn("text")
	id!: string;

	@Column("text", { unique: true })
	username!: string;

	@Column("text", { nullable: true })
	avatar_url!: string | null;

	@Column("text", { default: "offline" })
	status!: UserStatus;

	@Column("text")
	password_hash!: string;

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
