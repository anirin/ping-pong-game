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
			winnerId: String(raw.winnerId),
			opponentId: String(raw.opponentId),
			opponentName: String(raw.opponentName),
			opponentAvatarUrl: String(raw.opponentAvatarUrl),
		});
	}
}

// //
// // ...他のimportは既存のまま...

// /** ここに軽量DTOクラスを“同じファイル”で定義（他ファイルへの影響ゼロ） */
// export class MatchHistory {
//   // --- 試合基本 ---
//   readonly id: string;
//   readonly player1Id: string;
//   readonly player2Id: string;
//   readonly score1: number;
//   readonly score2: number;
//   readonly status: "finished";
//   readonly winnerId: string | null;

//   // --- 相手ユーザー表示用 ---
//   readonly opponentId: string;
//   readonly opponentName: string;
//   readonly opponentAvatarUrl: string | null;

//   // --- 自分視点の勝敗 ---
//   readonly result: "win" | "loss" | "unknown";

//   private constructor(props: {
//     id: string;
//     player1Id: string;
//     player2Id: string;
//     score1: number;
//     score2: number;
//     status: "finished";
//     winnerId: string | null;
//     round: number | null;
//     tournamentId: string | null;
//     opponentId: string;
//     opponentName: string;
//     opponentAvatarUrl: string | null;
//     selfUserId: string;
//   }) {
//     this.id = props.id;
//     this.player1Id = props.player1Id;
//     this.player2Id = props.player2Id;
//     this.score1 = props.score1;
//     this.score2 = props.score2;
//     this.status = "finished";
//     this.winnerId = props.winnerId;
//     this.round = props.round;
//     this.tournamentId = props.tournamentId;

//     this.opponentId = props.opponentId;
//     this.opponentName = props.opponentName;
//     this.opponentAvatarUrl = props.opponentAvatarUrl;

//     // 自分視点の勝敗（winnerIdがnullならunknown）
//     if (!props.winnerId) this.result = "unknown";
//     else this.result = props.winnerId === props.selfUserId ? "win" : "loss";
//   }

//   /** Raw行から安全に生成するファクトリ（AS名が一致していることが前提） */
//   static fromRaw(raw: any, selfUserId: string): MatchHistory {
//     // number化（SQLiteは数値も文字列で返ることがある）
//     const n = (v: any) => (v == null ? null : Number(v));

//     return new MatchHistory({
//       id: String(raw.id),
//       player1Id: String(raw.player1Id),
//       player2Id: String(raw.player2Id),
//       score1: Number(raw.score1),
//       score2: Number(raw.score2),
//       status: "finished",
//       winnerId: raw.winnerId ? String(raw.winnerId) : null,
//       round: n(raw.round),
//       tournamentId: raw.tournamentId ? String(raw.tournamentId) : null,
//       opponentId: String(raw.opponentId),
//       opponentName: raw.opponentName != null ? String(raw.opponentName) : "",
//       opponentAvatarUrl: raw.opponentAvatarUrl ?? null,
//       selfUserId,
//     });
//   }

//   toJSON() {
//     return {
//       id: this.id,
//       player1Id: this.player1Id,
//       player2Id: this.player2Id,
//       score1: this.score1,
//       score2: this.score2,
//       status: this.status,
//       winnerId: this.winnerId,
//       round: this.round,
//       tournamentId: this.tournamentId,
//       opponent: {
//         id: this.opponentId,
//         name: this.opponentName,
//         avatarUrl: this.opponentAvatarUrl,
//       },
//       result: this.result,
//     };
//   }
// }
// ///
