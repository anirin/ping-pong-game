import type { MatchId, UserId, MatchStatus } from '../common/types.js'
import { InvalidArgumentError, InvalidTransitionError } from '../common/errors.js'

export class Score {
	constructor(public readonly p1: number = 0, public readonly p2: number = 0) {
		if (p1 < 0 || p2 < 0) throw new InvalidArgumentError('score must be >= 0')
	}
	addP1(): Score { return new Score(this.p1 + 1, this.p2) }
	addP2(): Score { return new Score(this.p1, this.p2 + 1) }
}

export class Match {
	private _status: MatchStatus = 'scheduled'
	private _score: Score = new Score()
	private _winnerId: UserId | null = null

	constructor(
		public readonly id: MatchId,
		public readonly player1Id: UserId,
		public readonly player2Id: UserId,
		private readonly pointToWin: number,
	) {
		if (player1Id === player2Id) throw new InvalidArgumentError('players must be distinct')
		if (pointToWin <= 0) throw new InvalidArgumentError('pointToWin must be > 0')
	}

	get status() { return this._status }
	get score() { return this._score }
	get winnerId() { return this._winnerId }

	start() {
		if (this._status !== 'scheduled') throw new InvalidTransitionError('invalid transition')
		this._status = 'playing'
	}

	scorePoint(by: UserId) {
		if (this._status !== 'playing') throw new InvalidTransitionError('not playing')
		if (by !== this.player1Id && by !== this.player2Id) throw new InvalidArgumentError('not a player')

		this._score = by === this.player1Id ? this._score.addP1() : this._score.addP2()
		const p1Win = this._score.p1 >= this.pointToWin
		const p2Win = this._score.p2 >= this.pointToWin
		if (p1Win || p2Win) {
			this._winnerId = p1Win ? this.player1Id : this.player2Id
			this._status = 'finished'
		}
	}

	cancel() {
		if (this._status === 'finished') throw new InvalidTransitionError('already finished')
		this._status = 'canceled'
	}
}
