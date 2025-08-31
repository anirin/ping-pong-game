// import type { GameService } from "@application/services/game/GameService.js";
// import type { MatchRepository } from "@domain/interface/repository/match/MatchRepository.js";
// import { Match } from "@domain/model/entity/match/Match.js";
// import { MatchRule } from "@domain/model/value-object/match/Match.js"; //テスト用
// import type { WebSocketNotifier } from "@infrastructure/repository/websocket/WebSocketNotifier.js";
// import type { FastifyPluginAsync, FastifyRequest } from "fastify";

// type GameRoutesOptions = {
// 	gameService: GameService;
// 	webSocketNotifier: WebSocketNotifier;
// 	matchRepository: MatchRepository; // テスト用エンドポイントのために追加
// };

// const gameRoutes: FastifyPluginAsync<GameRoutesOptions> = async (
// 	fastify,
// 	options,
// ) => {
// 	const { gameService, webSocketNotifier, matchRepository } = options;
// 	fastify.post(
// 		"/test/creatematch",
// 		{
// 			preHandler: [(fastify as any).authenticate], // ★認証を要求する
// 		},
// 		async (request, reply) => {
// 			// ★認証されたユーザーのIDを取得

// 			const { player1Id, player2Id } = request.body as {
// 				player1Id: string;
// 				player2Id: string;
// 			};
// 			if (!player1Id || !player2Id) {
// 				return reply
// 					.code(400)
// 					.send({ error: "player1Id and player2Id are required." });
// 			}
// 			const rule = new MatchRule(
// 				20,
// 				{ vx: 5, vy: 5 },
// 				{ width: 800, height: 600 },
// 			);
// 			const matchId = `test-match-${Date.now()}`;
// 			const match = new Match(
// 				matchId,
// 				"test-tourney",
// 				player1Id,
// 				player2Id,
// 				1,
// 				rule,
// 			);
// 			await matchRepository.save(match);
// 			console.log(
// 				`[Test Endpoint] Created match. ID: ${matchId}, P1: ${player1Id}, P2: ${player2Id}`,
// 			);
// 			return reply
// 				.code(201)
// 				.send({ message: "Test match created successfully", matchId: matchId });
// 		},
// 	);
// 	fastify.get(
// 		"/ws/game/:matchId",
// 		{ websocket: true },
// 		(connection: any, request: FastifyRequest) => {
// 			const socket = connection.socket ? connection.socket : connection;

// 			try {
// 				const { matchId } = request.params as { matchId: string };
// 				const { token } = request.query as { token: string };

// 				if (!token) {
// 					console.log("[WebSocket] Connection attempt without token.");
// 					socket.close(4001, "Token is required");
// 					return;
// 				}

// 				let userId: string;
// 				try {
// 					const decoded = (fastify as any).jwt.verify(token) as { id: string };
// 					console.log("Decoded JWT payload from token:", decoded);
// 					userId = decoded.id;
// 				} catch (err) {
// 					console.error("[WebSocket] Authentication failed:", err);
// 					socket.close(4001, "Invalid or expired token");
// 					return;
// 				}

// 				console.log(
// 					`[WebSocket] User ${userId} connected to match ${matchId}.`,
// 				);
// 				webSocketNotifier.addConnection(matchId, userId, socket);

// 				socket.on("message", (message: Buffer) => {
// 					try {
// 						const data = JSON.parse(message.toString());
// 						if (
// 							data.status === "Match" &&
// 							data.action === "Move" &&
// 							data.position
// 						) {
// 							gameService.handlePlayerInput(matchId, userId, data.position.y);
// 						}
// 					} catch (error) {
// 						console.error("[WebSocket] Error parsing message:", error);
// 					}
// 				});
// 			} catch (error) {
// 				console.error(
// 					"[WebSocket] Unexpected error during connection setup:",
// 					error,
// 				);
// 				if (socket && typeof socket.close === "function") {
// 					socket.close(1011, "Internal server error");
// 				}
// 			}
// 		},
// 	);

// 	fastify.post(
// 		"/matches/:matchId/start",
// 		{
// 			preHandler: [(fastify as any).authenticate],
// 		},
// 		async (request, reply) => {
// 			try {
// 				const { matchId } = request.params as { matchId: string };

// 				await gameService.startMatch(matchId);

// 				return reply
// 					.code(200)
// 					.send({ message: `Match ${matchId} has started.` });
// 			} catch (error) {
// 				let errorMessage = "An unknown error occurred.";
// 				if (error instanceof Error) {
// 					errorMessage = error.message;
// 				}
// 				console.error(error);
// 				return reply
// 					.code(500)
// 					.send({ error: "Failed to start match.", details: errorMessage });
// 			}
// 		},
// 	);
// };

// export default gameRoutes;
