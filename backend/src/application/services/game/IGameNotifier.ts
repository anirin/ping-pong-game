import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { MatchFinishDto, RealtimeMatchStateDto } from "./MatchData.js";

export interface IGameNotifier {
	broadcastGameState(matchId: MatchId, state: RealtimeMatchStateDto): void;

	notifyMatchFinish(matchId: MatchId, result: MatchFinishDto): void;
}
