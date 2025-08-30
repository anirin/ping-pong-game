import type { RoomId } from "@domain/model/value-object/room/Room.js";
import type {
	TournamentId,
	WSTournamentData,
} from "@domain/model/value-object/tournament/Tournament.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export type TournamentIncomingMsg =
	| {
			status: "Tournament";
			action: "start_tournament";
			room_id: RoomId; // context にある
			created_by: UserId; // context にある
			participants: UserId[];
	  }

export type TournamentOutgoingMsg = {
	status: "Tournament";
	data: {
		type:
			| "tournament_status" // 現状の match を束ねているだけ
			// | "round_generated" next round は適宜 service 側で生成するだけ
			| "tournament_finished"; // 画面遷移させる
		room_id?: RoomId;
		user_id?: UserId;
		tournament?: any;
		next_match?: any;
		winner_id?: UserId;
	};
};
