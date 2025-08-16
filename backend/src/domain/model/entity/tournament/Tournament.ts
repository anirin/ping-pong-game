import type { MatchId } from "@domain/model/value-object/match/Match.js";
import type {
	TournamentId,
	TournamentStatus,
} from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import {
	InvalidArgumentError,
	InvalidTransitionError,
} from "../../common/errors.js";

export class Tournament {
	private _status: TournamentStatus = "waiting";
	private participants: UserId[] = [];
	private _matches: MatchId[] = [];

	constructor(public readonly id: TournamentId) {}

	get status() {
		return this._status;
	}
	get allParticipants() {
		return [...this.participants];
	}
	get matches() {
		return [...this._matches];
	}

	join(userId: UserId) {
		if (this._status !== "waiting")
			throw new InvalidTransitionError("cannot join now");
		if (this.participants.includes(userId))
			throw new InvalidArgumentError("already joined");
		this.participants.push(userId);
	}

	lock() {
		if (this._status !== "waiting")
			throw new InvalidTransitionError("invalid transition");
		if (this.participants.length < 2)
			throw new InvalidArgumentError("need at least 2 participants");
		this._status = "ongoing";
	}

	registerMatch(id: MatchId) {
		if (this._status !== "ongoing")
			throw new InvalidTransitionError("not ongoing");
		this._matches.push(id);
	}

	finish() {
		if (this._status !== "ongoing")
			throw new InvalidTransitionError("invalid transition");
		this._status = "finished";
	}
}
