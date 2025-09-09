import type {
	MatchId,
	MatchStatus,
} from "@domain/model/value-object/match/Match.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

// Game state types
export type PaddleStateDto = {
	id: UserId;
	y: number;
};

export type RealtimeMatchStateDto = {
	status: MatchStatus;
	ball: {
		x: number;
		y: number;
	};
	paddles: {
		player1: PaddleStateDto;
		player2: PaddleStateDto;
	};
	scores: {
		player1: number;
		player2: number;
	};
};

// Position types
export type MatchPosition = {
	y: number;
};

// Incoming messages from client
export type MatchIncomingMsg =
	| {
			status: "Match";
			action: "start";
			matchId: MatchId;
	  }
	| {
			status: "Match";
			action: "move";
			matchId: MatchId;
			data: MatchPosition;
	  }
	| {
			status: "Match";
			action: "ready";
			matchId: MatchId;
			data: { isReady: boolean };
	  }
	| {
			status: "Match";
			action: "get_initial_state";
			matchId: MatchId;
	  }
	;

// Outgoing messages to client
export type MatchOutgoingMsg =
	| {
			status: "Match";
			data: {
				type: "match_state";
				matchId: MatchId;
				state: RealtimeMatchStateDto;
			};
	  }
	| {
			status: "Match";
			data: {
				type: "match_started";
				matchId: MatchId;
			};
	  }
	| {
			status: "Match";
			data: {
				type: "none";
			};
	  }
	| {
			status: "Match";
			data: {
				type: "match_finished";
				matchId: MatchId;
				winnerId: UserId;
			};
	  }
	| {
			status: "Match";
			data: {
				type: "error";
				message: string;
			};
	  }
	| {
			status: "Match";
			data: {
				type: "ready_state";
				matchId: MatchId;
				readyPlayers: UserId[];
				readyCount: number;
			};
	  };
