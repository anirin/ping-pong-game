import type { Tournament } from "@domain/model/entity/tournament/Tournament.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";

export interface TournamentRepository {
	findById(id: TournamentId): Promise<Tournament | null>;
	findByRoomId(roomId: RoomId): Promise<Tournament | null>;
	save(tournament: Tournament): Promise<void>;
	update(tournament: Tournament): Promise<void>;
}
