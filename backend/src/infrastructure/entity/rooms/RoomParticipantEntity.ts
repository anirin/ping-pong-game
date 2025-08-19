import { Entity, PrimaryGeneratedColumn, ManyToOne, Unique } from "typeorm";
import { UserEntity } from "../users/UserEntity.js";
import { RoomEntity } from "./RoomEntity.js";

@Entity("RoomParticipant")
@Unique(["user"])
export class RoomParticipantEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(
		() => RoomEntity,
		(room) => room.room_participants,
		{ onDelete: "CASCADE" },
	)
	room!: RoomEntity;

	@ManyToOne(
		() => UserEntity,
		(user) => user.room_participant,
		{ onDelete: "CASCADE" },
	)
	user!: UserEntity;
}
