import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import type { Match } from "@domain/model/entity/match/Match.js";
import type { MatchHistory } from "@domain/model/entity/match/MatchHistory.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { v4 as uuidv4 } from "uuid";

export class MatchRoutesService {
	constructor(private readonly matchRepository: MatchRepository) {}

	async getMatchList(userId: UserId): Promise<MatchHistory[] | null> {
		return this.matchRepository.findFinishedByUser(userId);
	}
}
