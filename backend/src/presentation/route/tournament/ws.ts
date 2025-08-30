// src/presentation/ws/tournament-ws.ts

import { TournamentService } from "@application/services/tournament/TournamentService.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type { TournamentId } from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { IncomingMsg, OutgoingMsg } from "./mapper.js";
import { toTournamentDTO, toMatchDTO } from "./mapper.js";

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
