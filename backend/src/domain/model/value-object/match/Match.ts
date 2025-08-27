import type { UserId } from "../user/User.js";
export type MatchId = string;
export type MatchStatus = "scheduled" | "playing" | "finished" | "canceled";

export type BallState = {
    x: number;
    y: number;
    vx: number;
    vy: number;
};

export type PaddleState = {
    y: number;
};

export type FrameState = {
    ball: BallState;
    player1Paddle: PaddleState;
    player2Paddle: PaddleState;
};

export class MatchRule {
    private readonly PADDLE_HEIGHT = 100;
    private readonly PADDLE_WIDTH = 10;
    private readonly BALL_RADIUS = 10;

    public readonly pointToWin: number;
    public readonly initialBallSpeed: { readonly vx: number; readonly vy: number };
    public readonly fieldSize: { readonly width: number; readonly height: number };
    public readonly totalSpeed: number;

    constructor(
        pointToWin: number,
        initialBallSpeed: { vx: number; vy: number },
        fieldSize: { width: number; height: number }
    ) {
        if (pointToWin <= 0) throw new Error("pointToWin must be a positive number.");

        this.pointToWin = pointToWin;
        this.initialBallSpeed = initialBallSpeed;
        this.fieldSize = fieldSize;
        this.totalSpeed = Math.sqrt(initialBallSpeed.vx ** 2 + initialBallSpeed.vy ** 2);
        Object.freeze(this);
    }

    public calculateNextFrame(state: FrameState): { nextBallState: BallState; scorer?: UserId } {
        let nextBall = { ...state.ball };
        const { player1Paddle, player2Paddle } = state;

        nextBall.x += nextBall.vx;
        nextBall.y += nextBall.vy;

        if (nextBall.y - this.BALL_RADIUS <= 0 || nextBall.y + this.BALL_RADIUS >= this.fieldSize.height) {
            nextBall.vy *= -1;
        }
        let hit = false;

        if (nextBall.vx < 0 &&
            nextBall.x - this.BALL_RADIUS < this.PADDLE_WIDTH &&
            nextBall.y > player1Paddle.y - this.PADDLE_HEIGHT / 2 &&
            nextBall.y < player1Paddle.y + this.PADDLE_HEIGHT / 2) {
            const intersectY = (player1Paddle.y - nextBall.y) / (this.PADDLE_HEIGHT / 2);

            const MAX_BOUNCE_ANGLE = (5 * Math.PI) / 12;
            const bounceAngle = intersectY * MAX_BOUNCE_ANGLE;

            nextBall.vx = this.totalSpeed * Math.cos(bounceAngle);
            nextBall.vy = this.totalSpeed * -Math.sin(bounceAngle);
            hit = true;
        }

        else if (nextBall.vx > 0 && nextBall.x + this.BALL_RADIUS > this.fieldSize.width - this.PADDLE_WIDTH) {
            if (nextBall.y > player2Paddle.y - this.PADDLE_HEIGHT / 2 &&
                nextBall.y < player2Paddle.y + this.PADDLE_HEIGHT / 2) {

                const intersectY = (player2Paddle.y - nextBall.y) / (this.PADDLE_HEIGHT / 2);
                const MAX_BOUNCE_ANGLE = (5 * Math.PI) / 12;
                const bounceAngle = intersectY * MAX_BOUNCE_ANGLE;

                nextBall.vx = -this.totalSpeed * Math.cos(bounceAngle);
                nextBall.vy = this.totalSpeed * -Math.sin(bounceAngle);
                hit = true;
            }
        }

        if (nextBall.x - this.BALL_RADIUS < 0) {
            return { nextBallState: nextBall, scorer: "player2" as UserId };
        }
        if (nextBall.x + this.BALL_RADIUS > this.fieldSize.width) {
            return { nextBallState: nextBall, scorer: "player1" as UserId };
        }

        return { nextBallState: nextBall };
    }
}