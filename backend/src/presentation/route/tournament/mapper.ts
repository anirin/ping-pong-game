// src/presentation/route/tournament/mapper.ts

import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

// 送受信用の最小DTO。必要なら拡張してOK
export type IncomingMsg =
	| { action: "subscribe"; room_id: RoomId; user_id: UserId }
	| {
			action: "start_tournament";
			room_id: RoomId;
			created_by: UserId;
			participants: UserId[];
	  }
	| { action: "next_round"; tournament_id: TournamentId; room_id: RoomId }
	| {
			action: "finish_tournament";
			tournament_id: TournamentId;
			room_id: RoomId;
			winner_id: UserId;
	  }
	| {
			action: "get_next_match";
			tournament_id: TournamentId;
			room_id: RoomId;
	  };

export type OutgoingMsg =
	| { type: "subscribed"; room_id: RoomId; user_id: UserId }
	| { type: "tournament_started"; tournament: TournamentDTO; next_match: MatchDTO | null }
	| { type: "round_generated"; tournament: TournamentDTO; next_match: MatchDTO | null }
	| { type: "tournament_finished"; tournament: { id: TournamentId; winner_id: UserId } }
	| { type: "error"; message: string }
	| { type: "next_match"; next_match: MatchDTO | null };

// DTO型定義
export interface TournamentDTO {
	id: TournamentId;
	status: string;
	currentRound: number;
	winner_id: UserId | null;
	participants: UserId[];
	matches: MatchDTO[];
}

export interface MatchDTO {
	id: string;
	player1_id: UserId;
	player2_id: UserId;
	player1_name: string;
	player2_name: string;
	score1: number;
	score2: number;
	status: string;
	round: number;
	winner_id: UserId | null;
}

// class直送しないための最低限の整形
export function toTournamentDTO(t: any): TournamentDTO {
	return {
		id: t.id,
		status: t.status ?? t._status,
		currentRound: t.currentRound,
		winner_id: t.winner_id ?? null,
		participants: t.participants,
		matches: (t.matches ?? []).map(toMatchDTO),
	};
}

export function toMatchDTO(m: any): MatchDTO {
	return {
		id: m.id,
		player1_id: m.player1Id ?? m.player1_id ?? m._player1?.id,
		player2_id: m.player2Id ?? m.player2_id ?? m._player2?.id,
		player1_name:
			m.player1_name ??
			m._player1?.name ??
			m.player1Id ??
			m.player1_id ??
			m._player1?.id,
		player2_name:
			m.player2_name ??
			m._player2?.name ??
			m.player2Id ??
			m.player2_id ??
			m._player2?.id,
		score1: m.score1 ?? m._score1 ?? 0,
		score2: m.score2 ?? m._score2 ?? 0,
		status: m.status ?? m._status,
		round: m.round ?? 1,
		winner_id: m.winner_id ?? m.winnerId ?? null,
	};
}
