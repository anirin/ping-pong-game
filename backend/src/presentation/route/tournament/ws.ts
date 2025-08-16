// presentation/route/tournament/ws.ts
import type { FastifyInstance } from "fastify";
import type { SocketStream } from "@fastify/websocket";

type StateSnapshot = {
	tournament: { id: string; status: "ready" | "running" | "finished" };
	matches: Array<{
		id: string;
		players: {
			a?: { id: string; name: string };
			b?: { id: string; name: string };
		};
		status: "ready" | "in_progress" | "finished";
		score?: { a: number; b: number };
	}>;
	updatedAt: string;
};

type ClientMsg =
	| {
			type: "tournament.start";
			payload: {
				participants: Array<{ id: string; name: string }>;
				format?: "single_elim";
			};
	  }
	| {
			type: "match.start";
			payload: { tournamentId: string; matchId: string };
	  }
	| {
			type: "match.finish";
			payload: {
				tournamentId: string;
				matchId: string;
				winnerId: string;
				scoreA: number;
				scoreB: number;
			};
	  }
	| {
			type: "state.request";
			payload: { tournamentId: string };
	  };

type ServerMsg =
	| { type: "state.push"; payload: StateSnapshot }
	| { type: "error"; payload: { message: string } };

type Deps = {
	StartTournamentWithBracket: (input: {
		participants: Array<{ id: string; name: string }>;
		format?: "single_elim";
	}) => Promise<StateSnapshot>;
	StartMatch: (input: {
		tournamentId: string;
		matchId: string;
	}) => Promise<StateSnapshot>;
	FinishMatchAndPropagate: (input: {
		tournamentId: string;
		matchId: string;
		winnerId: string;
		scoreA: number;
		scoreB: number;
	}) => Promise<StateSnapshot>;
	GetTournamentState: (input: {
		tournamentId: string;
	}) => Promise<StateSnapshot>;
};

export function registerTournamentWs(app: FastifyInstance, deps: Deps) {
	const clients = new Set<SocketStream["socket"]>();

	app.get("/ws/tournaments", { websocket: true }, (conn) => {
		const { socket } = conn;
		clients.add(socket);

		socket.on("message", async (raw) => {
			let msg: ClientMsg;
			try {
				msg = JSON.parse(String(raw));
			} catch {
				send(socket, { type: "error", payload: { message: "invalid_json" } });
				return;
			}

			try {
				switch (msg.type) {
					case "tournament.start": {
						const state = await deps.StartTournamentWithBracket({
							participants: msg.payload.participants,
							format: msg.payload.format ?? "single_elim",
						});
						broadcast(clients, { type: "state.push", payload: state });
						break;
					}
					case "match.start": {
						const state = await deps.StartMatch({
							tournamentId: msg.payload.tournamentId,
							matchId: msg.payload.matchId,
						});
						broadcast(clients, { type: "state.push", payload: state });
						break;
					}
					case "match.finish": {
						const state = await deps.FinishMatchAndPropagate({
							tournamentId: msg.payload.tournamentId,
							matchId: msg.payload.matchId,
							winnerId: msg.payload.winnerId,
							scoreA: msg.payload.scoreA,
							scoreB: msg.payload.scoreB,
						});
						broadcast(clients, { type: "state.push", payload: state });
						break;
					}
					case "state.request": {
						const state = await deps.GetTournamentState({
							tournamentId: msg.payload.tournamentId,
						});
						send(socket, { type: "state.push", payload: state });
						break;
					}
					default: {
						send(socket, {
							type: "error",
							payload: { message: "unknown_type" },
						});
					}
				}
			} catch (e) {
				send(socket, {
					type: "error",
					payload: { message: (e as Error).message || "internal_error" },
				});
			}
		});

		socket.on("close", () => {
			clients.delete(socket);
		});
	});

	function send(ws: SocketStream["socket"], msg: ServerMsg) {
		if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
	}

	function broadcast(pool: Set<SocketStream["socket"]>, msg: ServerMsg) {
		const data = JSON.stringify(msg);
		for (const ws of pool) if (ws.readyState === ws.OPEN) ws.send(data);
	}
}
