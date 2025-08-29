// src/presentation/ws/tournament-ws.ts

import { TournamentService } from "@application/services/tournament/TournamentService.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

// 送受信用の最小DTO。必要なら拡張してOK
type IncomingMsg =
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

type OutgoingMsg =
	| { type: "subscribed"; room_id: RoomId; user_id: UserId }
	| { type: "tournament_started"; tournament: any; next_match: any | null }
	| { type: "round_generated"; tournament: any; next_match: any | null }
	| { type: "tournament_finished"; tournament: any }
	| { type: "error"; message: string }
	| { type: "next_match"; next_match: any | null };

const rooms = new Map<RoomId, Set<WebSocket>>();

function joinRoom(roomId: RoomId, ws: WebSocket) {
	let set = rooms.get(roomId);
	if (!set) {
		set = new Set();
		rooms.set(roomId, set);
	}
	set.add(ws);
}

function leaveAll(ws: WebSocket) {
	for (const set of rooms.values()) set.delete(ws);
}

function broadcast(roomId: RoomId, payload: OutgoingMsg) {
	const set = rooms.get(roomId);
	if (!set?.size) return;
	const msg = JSON.stringify(payload);
	for (const sock of set) {
		// sock は ws のインスタンス
		if ((sock as any).readyState === (sock as any).OPEN) sock.send(msg);
	}
}

// class直送しないための最低限の整形
function toTournamentDTO(t: any) {
	return {
		id: t.id,
		status: t.status ?? t._status,
		currentRound: t.currentRound,
		winner_id: t.winner_id ?? null,
		participants: t.participants,
		matches: (t.matches ?? []).map(toMatchDTO),
	};
}

function toMatchDTO(m: any) {
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

export async function registerTournamentWs(app: FastifyInstance) {
	const svc = new TournamentService();

	// /ws プレフィクスは fastifyWebSocket 登録側で設定している想定
	app.get(
		"/ws/tournament",
		{ websocket: true },
		(connection: any /*, req */) => {
			const ws = connection;
			console.log("WebSocket接続が確立されました: /ws/tournament");

			// このコネクション専用の状態
			let authedUser: UserId | null = null;
			let joinedRoom: RoomId | null = null;

			ws.on("message", async (raw: any) => {
				console.log("WebSocketメッセージを受信:", raw.toString());
				let data: IncomingMsg;
				try {
					data = JSON.parse(raw.toString());
				} catch {
					console.error("JSON解析エラー:", raw.toString());
					ws.send(
						JSON.stringify({
							type: "error",
							message: "invalid json",
						} satisfies OutgoingMsg),
					);
					return;
				}

				try {
					switch (data.action) {
						case "subscribe": {
							authedUser = data.user_id;
							joinedRoom = data.room_id;
							joinRoom(joinedRoom, ws);
							ws.send(
								JSON.stringify({
									type: "subscribed",
									room_id: joinedRoom,
									user_id: authedUser,
								} satisfies OutgoingMsg),
							);
							break;
						}

						case "start_tournament": {
							if (!joinedRoom) throw new Error("not subscribed");
							const { tournament, nextMatch } = await svc.startTournament(
								data.participants,
								data.room_id,
								data.created_by,
							);
							broadcast(data.room_id, {
								type: "tournament_started",
								tournament: toTournamentDTO(tournament),
								next_match: nextMatch ? toMatchDTO(nextMatch) : null,
							});
							break;
						}

						case "next_round": {
							if (!joinedRoom) throw new Error("not subscribed");
							const { tournament, nextMatch } = await svc.generateNextRound(
								data.tournament_id,
							);
							broadcast(data.room_id, {
								type: "round_generated",
								tournament: toTournamentDTO(tournament),
								next_match: nextMatch ? toMatchDTO(nextMatch) : null,
							});
							break;
						}

						case "get_next_match": {
							if (!joinedRoom) throw new Error("not subscribed");
							const nextMatch = await svc.getNextMatch(data.tournament_id);
							broadcast(data.room_id, {
								type: "next_match",
								next_match: nextMatch ? toMatchDTO(nextMatch) : null,
							});
							break;
						}

						case "finish_tournament": {
							if (!joinedRoom) throw new Error("not subscribed");
							await svc.finishTournament(data.tournament_id, data.winner_id);
							broadcast(data.room_id, {
								type: "tournament_finished",
								tournament: {
									id: data.tournament_id,
									winner_id: data.winner_id,
								},
							});
							break;
						}

						default: {
							ws.send(
								JSON.stringify({
									type: "error",
									message: "unknown action",
								} satisfies OutgoingMsg),
							);
						}
					}
				} catch (e: any) {
					ws.send(
						JSON.stringify({
							type: "error",
							message: e?.message ?? "internal error",
						} satisfies OutgoingMsg),
					);
				}
			});

			ws.on("close", () => {
				leaveAll(ws);
			});
		},
	);
}
