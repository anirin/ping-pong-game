// src/infrastructure/data-source.ts
import { DataSource } from "typeorm";
import { MatchEntity } from "./entity/match/MatchEntity.js";
import { RoomEntity } from "./entity/rooms/RoomEntity.js";
import { TournamentEntity } from "./entity/tournament/TournamentEntity.js";
import { UserEntity } from "./entity/users/UserEntity.js";

export const AppDataSource = new DataSource({
	type: "sqlite",
	database: "./database.sqlite",
	entities: [UserEntity, RoomEntity, TournamentEntity, MatchEntity],
	synchronize: true,
	logging: true,
});
