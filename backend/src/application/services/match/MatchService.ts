import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import type { Match, MatchId } from "@domain/model/value-object/match/Match.js";

type MatchInterval = {
	interval: NodeJS.Timeout;
	match: Match;
};

export class MatchService {
	private intervals: Map<MatchId, MatchInterval> = new Map();

	constructor(private readonly matchRepository: MatchRepository) {}

	async renderMatch(matchId: MatchId): Promise<void> {
		const match = await this.matchRepository.findById(matchId);

		// match 画面を render する broadcast を行う
		// running に status を変更する
	}

	async startMatch(matchId: MatchId): Promise<void> {
		// setInterval を用いて match の ball と paddles の位置を更新し続ける
		const interval = setInterval(async () => {
			const match = await this.matchRepository.findById(matchId);
			if (!match) {
				clearInterval(interval);
				return;
			}
			// 途中の切断などは stopMatch を呼び出す 再開は startMatch を呼び出す
			// 終了時は finishMatch を呼び出す
		}, 1000 / 60); //30fpsの方がいい
	}

	async stopMatch(matchId: MatchId): Promise<void> {
		const match = await this.matchRepository.findById(matchId);
		match.stop();
		await this.matchRepository.save(match);
	}

	async finishMatch(matchId: MatchId): Promise<void> {
		// match に score と winner を反映させ終了させる

		// tournament event を発火する eventemitter を用いる
	}

	async handlePlayerInput(matchId: MatchId, userId: UserId, y: number): Promise<void> {
		// 適切な user を元に handling を行う　（観戦者は操作できない）

	}
}