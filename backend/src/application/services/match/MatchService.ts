import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { Match } from "@domain/model/entity/match/Match.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

type Info = {
	interval: NodeJS.Timeout;
	match: Match;
};

export class MatchService {
	private intervals: Map<MatchId, Info> = new Map();

	constructor(private readonly matchRepository: MatchRepository) {}

	async renderMatch(matchId: MatchId): Promise<void> {
		const match = await this.matchRepository.findById(matchId);

		// match 画面を render する broadcast を行う
		this.startMatch(matchId); // running に status を変更する
	}

	async startMatch(matchId: MatchId): Promise<void> {
		const match = await this.matchRepository.findById(matchId); // repository の match と domain の match 同じではないやろ
		if (!match) {
			clearInterval(this.intervals.get(matchId)?.interval);
			this.intervals.delete(matchId);
			return;
		}
		// setInterval を用いて match の ball と paddles の位置を更新し続ける
		const interval = setInterval(async () => {
			match.advanceFrame();
			
			if (match.status === "finished") {
				clearInterval(interval);
				this.intervals.delete(matchId);
				this.finishMatch(matchId, match.winnerId!);
				return;
			}

			// broadcast を常に行う eventemitter を用いる
		}, 1000 / 60); //60fps

		this.intervals.set(matchId, { interval, match });
	}

	// todo 後回し（必要）
	// async stopMatch(matchId: MatchId): Promise<void> {
	// 	const match = await this.matchRepository.findById(matchId);
	// 	match.stop();
	// 	await this.matchRepository.save(match);
	// }

	async finishMatch(matchId: MatchId, winnerId: UserId): Promise<void> {
		// match に score と winner を反映させ終了させる
		const match = await this.matchRepository.findById(matchId);
		if (!match) return;
		
		match.finish(winnerId);
		await this.matchRepository.save(match);
		// tournament event を発火する eventemitter を用いる
	}

	async handlePlayerInput(matchId: MatchId, userId: UserId, y: number): Promise<void> {
		// 適切な user を元に handling を行う　（観戦者は操作できない）

	}
}