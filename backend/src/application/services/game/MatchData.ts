import type { MatchStatus } from "@domain/model/value-object/match/Match.js";
import type { UserId } from "@domain/model/value-object/user/User.js";

export type RealtimeMatchStateDto = {
    status: MatchStatus;
    ball: { 
        x: number; 
        y: number;
    };
    paddles: {
        player1: { y: number };
        player2: { y: number };
    };
    scores: {
        player1: number;
        player2: number;
    };
};

export type MatchFinishDto = {
    status: 'finished';
    winnerId: UserId;
};