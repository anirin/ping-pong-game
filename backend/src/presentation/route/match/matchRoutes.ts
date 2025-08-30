import type {
	MatchIncomingMsg,
	MatchOutgoingMsg,
} from "@presentation/route/match/match-msg.js";
import { MatchService } from "@application/services/match/MatchService.js";

export async function MatchWSHandler(
	msg: MatchIncomingMsg,
): Promise<MatchOutgoingMsg> {
	const matchService = new MatchService();
	switch (msg.action) {
		case "start":
			// ゲームスタート
			await matchService.startMatch(msg.matchId);
			return {
				status: "Match",
				data: { type: "match_status" },
			};
	}
}
