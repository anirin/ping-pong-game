import type { FastifyInstance } from "fastify";
import WebSocket from "@fastify/websocket";
import type { WSIncomingMsg, WSOutgoingMsg } from "./ws-msg.js";
import type { UserId } from "@domain/model/value-object/user/User.js";
import type { RoomId } from "@domain/model/value-object/room/Room.js";

export async function registerWebSocket(app: FastifyInstance) {
	app.get("/wss", { websocket: true }, (connection: WebSocket.WebSocket) => {
		const ws = connection;

		let authedUser: UserId | null = null;
		let joinedRoom: RoomId | null = null;
		ws.on("message", async (raw: any) => {
			let data: WSIncomingMsg;
			try {
				data = JSON.parse(raw.toString());
			} catch {
				ws.send(
					JSON.stringify({
						status: "error",
						msg: "invalid json",
					} satisfies WSOutgoingMsg),
				);
				return;
			}
			try {
				switch (data.status) {
					case "Room": {
						RoomWSHandler();
					}
					case "User": {
					}
					case "Match": {
					}
				}
			} catch {}
		});

		// // このコネクション専用の状態

		// ws.on("message", async (raw: any) => {
		//   let data: IncomingMsg;
		//   try {
		//     data = JSON.parse(raw.toString());
		//   } catch {
		//     ws.send(
		//       JSON.stringify({
		//         type: "error",
		//         message: "invalid json",
		//       } satisfies OutgoingMsg),
		//     );
		//     return;
		//   }

		//   try {
		//     switch (data.action) {
		//       case "subscribe": {
		//         authedUser = data.user_id;
		//         joinedRoom = data.room_id;
		//         joinRoom(joinedRoom, ws);
		//         ws.send(
		//           JSON.stringify({
		//             type: "subscribed",
		//             room_id: joinedRoom,
		//             user_id: authedUser,
		//           } satisfies OutgoingMsg),
		//         );
		//         break;
		//       }

		//       case "start_tournament": {
		//         if (!joinedRoom) throw new Error("not subscribed");
		//         const { tournament, nextMatch } = await svc.startTournament(
		//           data.participants,
		//           data.room_id,
		//           data.created_by,
		//         );
		//         broadcast(data.room_id, {
		//           type: "tournament_started",
		//           tournament: toTournamentDTO(tournament),
		//           next_match: nextMatch ? toMatchDTO(nextMatch) : null,
		//         });
		//           break;
		//         }

		//         case "next_round": {
		//           if (!joinedRoom) throw new Error("not subscribed");
		//           const { tournament, nextMatch } = await svc.generateNextRound(
		//             data.tournament_id,
		//           );
		//           broadcast(data.room_id, {
		//             type: "round_generated",
		//             tournament: toTournamentDTO(tournament),
		//             next_match: nextMatch ? toMatchDTO(nextMatch) : null,
		//           });
		//           break;
		//         }

		//         case "get_next_match": {
		//           if (!joinedRoom) throw new Error("not subscribed");
		//           const nextMatch = await svc.getNextMatch(data.tournament_id);
		//           broadcast(data.room_id, {
		//             type: "next_match",
		//             next_match: nextMatch ? toMatchDTO(nextMatch) : null,
		//           });
		//           break;
		//         }

		//         case "finish_tournament": {
		//           if (!joinedRoom) throw new Error("not subscribed");
		//           await svc.finishTournament(data.tournament_id, data.winner_id);
		//           broadcast(data.room_id, {
		//             type: "tournament_finished",
		//             tournament: {
		//               id: data.tournament_id,
		//               winner_id: data.winner_id,
		//             },
		//           });
		//           break;
		//         }

		//         default: {
		//           ws.send(
		//             JSON.stringify({
		//               type: "error",
		//               message: "unknown action",
		//             } satisfies OutgoingMsg),
		//           );
		//         }
		//       }
		//     } catch (e: any) {
		//       ws.send(
		//         JSON.stringify({
		//           type: "error",
		//           message: e?.message ?? "internal error",
		//         } satisfies OutgoingMsg),
		//       );
		//     }
		//   });

		//   ws.on("close", () => {
		//     leaveAll(ws);
		//   });
	});
}
