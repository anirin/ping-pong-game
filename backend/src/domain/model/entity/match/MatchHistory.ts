import type { MatchStatus } from "@domain/model/value-object/match/Match.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import { UserEntity } from "@infrastructure/entity/users/UserEntity.js";

export class MatchHistory {
	readonly id: string;
	readonly player1Id: UserId;
	readonly player2Id: UserId;
	readonly score1: number;
	readonly score2: number;
	readonly status: MatchStatus;
	readonly winnerId: UserId | null;
	readonly game_date: Date;

	readonly opponentId: string;
	readonly opponentName: string;
	readonly opponentAvatarUrl: string;

	constructor(props: {
		id: string;
		player1Id: UserId;
		player2Id: UserId;
		score1: number;
		score2: number;
		status: MatchStatus;
		winnerId: UserId | null;
		game_date: Date;
		opponentId: string;
		opponentName: string;
		opponentAvatarUrl: string;
	}) {
		this.id = props.id;
		this.player1Id = props.player1Id;
		this.player2Id = props.player2Id;
		this.status = props.status;
		this.score1 = props.score1;
		this.score2 = props.score2;
		this.game_date = props.game_date;
		this.winnerId = props.winnerId;
		this.opponentId = props.opponentId;
		this.opponentName = props.opponentName;
		this.opponentAvatarUrl = props.opponentAvatarUrl;
	}
	static fromRaw(raw: any, userId: string): MatchHistory {
		return new MatchHistory({
			id: String(raw.id),
			player1Id: String(raw.player1Id),
			player2Id: String(raw.player2Id),
			score1: Number(raw.score1),
			score2: Number(raw.score2),
			status: String(raw.status) as MatchStatus,
			game_date: new Date(raw.game_date),
			winnerId: String(raw.winnerId),
			opponentId: String(raw.opponentId),
			opponentName: String(raw.opponentName),
			opponentAvatarUrl: String(raw.opponentAvatarUrl),
		});
	}
}
