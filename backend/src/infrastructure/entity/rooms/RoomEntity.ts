import type {
	RoomMode,
	RoomStatus,
	RoomType,
} from "@domain/model/value-object/room/Room.js";
import {
	Column,
	CreateDateColumn,
	Entity,
	ManyToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity("Room")
export class RoomEntity {
	@PrimaryColumn("text")
	id!: string;

	// @ManyToMany('text')
	@Column("text")
	owner_id!: string;

	@Column("text", { default: "waiting" })
	status!: RoomStatus;

	@Column("text", { default: "online" })
	mode!: RoomMode;

	@Column("text", { default: "1on1" })
	room_type!: RoomType;

	@CreateDateColumn()
	created_at!: Date;

	@UpdateDateColumn()
	updated_at!: Date;
}
