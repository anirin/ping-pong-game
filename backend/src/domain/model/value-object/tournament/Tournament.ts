import type { Match } from "@domain/model/entity/match/Match.js";
import type { MatchId } from "../match/Match.js";

export type TournamentStatus = "waiting" | "ongoing" | "finished";
export type TournamentId = string;
export type TournamentType = "1on1" | "multi";

export type WSTournamentData = {
  next_match_id: MatchId,
  matches: Match[]
}
