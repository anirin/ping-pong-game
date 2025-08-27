import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
import type { Match } from "@domain/model/entity/match/Match.js";
import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type { IGameNotifier } from "./IGameNotifier.js";
import type { RealtimeMatchStateDto } from "./MatchData.js";

type ActiveGame = {
	match: Match;
	loopId: NodeJS.Timeout;
};

export class GameService {
	private activeGames: Map<MatchId, ActiveGame> = new Map();

	constructor(
		private readonly matchRepository: MatchRepository,
		private readonly gameNotifier: IGameNotifier,
	) {}

	public async startMatch(matchId: MatchId): Promise<void> {
		if (this.activeGames.has(matchId)) {
			console.warn(`[GameService] Match ${matchId} is already in progress.`);
			return;
		}
		const match = await this.matchRepository.findById(matchId);
		if (!match) {
			throw new Error(`[GameService] Match with id ${matchId} not found.`);
		}

		match.start();
		await this.matchRepository.save(match);

		const activeGame: ActiveGame = { match, loopId: null as any };
		this.activeGames.set(matchId, activeGame);

		const loopId = setInterval(async () => {
			const currentGame = this.activeGames.get(matchId);
			if (!currentGame) {
				clearInterval(loopId);
				return;
			}

			currentGame.match.advanceFrame();
			await this.matchRepository.save(currentGame.match);

			const stateDto = this.createDtoFromMatch(currentGame.match);
			this.gameNotifier.broadcastGameState(matchId, stateDto);

			if (currentGame.match.status === "finished") {
				this.stopMatch(matchId);
			}
		}, 1000 / 60);

		activeGame.loopId = loopId;

		console.log(
			`[GameService] Match ${matchId} has started and game loop is running.`,
		);
	}

	public handlePlayerInput(
		matchId: MatchId,
		playerId: UserId,
		y: number,
	): void {
		const activeGame = this.activeGames.get(matchId);
		if (activeGame) {
			activeGame.match.movePaddle(playerId, y);
		}
	}

	private stopMatch(matchId: MatchId): void {
		const activeGame = this.activeGames.get(matchId);
		if (!activeGame) return;

		clearInterval(activeGame.loopId);

		this.activeGames.delete(matchId);

		this.gameNotifier.notifyMatchFinish(matchId, {
			status: "finished",
			winnerId: activeGame.match.winnerId!,
		});

		console.log(`[GameService] Match ${matchId} has finished.`);
	}

	private createDtoFromMatch(match: Match): RealtimeMatchStateDto {
		return {
			status: match.status,
			ball: {
				x: match.ballState.x,
				y: match.ballState.y,
			},
			paddles: {
				player1: { y: match.paddle1State.y },
				player2: { y: match.paddle2State.y },
			},
			scores: {
				player1: match.score1,
				player2: match.score2,
			},
		};
	}
}
