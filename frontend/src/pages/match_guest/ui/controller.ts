import { navigate } from "../../../app/routing";

// 定数定義
const CONSTANTS = {
	PADDLE_SPEED: 7,
	PADDLE_HEIGHT: 100,
	PADDLE_WIDTH: 10,
	PADDLE_MARGIN: 10,
	BALL_RADIUS: 10,
	INITIAL_PADDLE_Y: 300,
	PADDLE_MIN_Y: 50,
	PADDLE_MAX_Y: 550,
	FONT_SIZE_LARGE: "50px Arial",
	FONT_SIZE_MEDIUM: "24px Arial",
} as const;

const KEY_BINDINGS = {
	// プレイヤー1（左側）の操作
	PLAYER1_UP: ["ArrowUp", "w"] as const,
	PLAYER1_DOWN: ["ArrowDown", "s"] as const,
	// プレイヤー2（右側）の操作
	PLAYER2_UP: ["ArrowLeft", "a"] as const,
	PLAYER2_DOWN: ["ArrowRight", "d"] as const,
} as const;

interface GuestMatchState {
	ballX: number;
	ballY: number;
	ballSpeedX: number;
	ballSpeedY: number;
	paddle1Y: number;
	paddle2Y: number;
	score1: number;
	score2: number;
	gameStatus: "waiting" | "playing" | "paused" | "finished";
	winner?: string;
}

export class GuestMatchController {
	private matchId: string | null = null;
	private player1: string = "Player 1";
	private player2: string = "Player 2";
	private round: number = 1;
	private animationFrameId: number | null = null;
	private gameState: GuestMatchState;
	// プレイヤー1の操作状態
	private player1MovingUp: boolean = false;
	private player1MovingDown: boolean = false;
	// プレイヤー2の操作状態
	private player2MovingUp: boolean = false;
	private player2MovingDown: boolean = false;
	private handleKeyDownRef: (e: KeyboardEvent) => void;
	private handleKeyUpRef: (e: KeyboardEvent) => void;
	private isDestroyed: boolean = false;
	private gameLoopInterval: ReturnType<typeof setInterval> | null = null;

	constructor(params?: { [key: string]: string }) {
		console.log("GuestMatchController constructor", params);

		// グローバル状態からマッチ情報を取得
		this.loadMatchInfoFromGlobalState();

		console.log("マッチ情報を設定:", {
			matchId: this.matchId,
			player1: this.player1,
			player2: this.player2,
			round: this.round,
		});

		this.handleKeyDownRef = this.handleKeyDown.bind(this);
		this.handleKeyUpRef = this.handleKeyUp.bind(this);

		// ゲーム状態を初期化
		this.gameState = {
			ballX: 400,
			ballY: 300,
			ballSpeedX: 5,
			ballSpeedY: 3,
			paddle1Y: CONSTANTS.INITIAL_PADDLE_Y,
			paddle2Y: CONSTANTS.INITIAL_PADDLE_Y,
			score1: 0,
			score2: 0,
			gameStatus: "waiting",
		};
	}

	private async loadMatchInfoFromGlobalState(): Promise<void> {
		try {
			const { TournamentStateManager } = await import(
				"../../tournament_guest/ui/tournamentState.js"
			);
			const stateManager = TournamentStateManager.getInstance();
			const currentMatch = stateManager.getCurrentMatch();

			if (currentMatch) {
				this.matchId = currentMatch.matchId;
				this.player1 = currentMatch.player1;
				this.player2 = currentMatch.player2;
				this.round = currentMatch.round;
				console.log("グローバル状態からマッチ情報を取得:", currentMatch);
			} else {
				console.warn(
					"グローバル状態にマッチ情報が見つかりません。デフォルト値を使用します。",
				);
				this.matchId = "unknown-match";
				this.player1 = "Player 1";
				this.player2 = "Player 2";
				this.round = 1;
			}
		} catch (error) {
			console.error(
				"グローバル状態からマッチ情報を取得できませんでした:",
				error,
			);
			this.matchId = "unknown-match";
			this.player1 = "Player 1";
			this.player2 = "Player 2";
			this.round = 1;
		}
	}

	public async render(): Promise<void> {
		await this.runMatch();
	}

	private async runMatch(): Promise<void> {
		try {
			this.initializeMatchState();
			this.setupEventListeners();
			this.startGame();
		} catch (error) {
			this.handleError("Failed to start guest match", "/");
			console.error("Guest match initialization error:", error);
		}
	}

	private initializeMatchState(): void {
		// プレイヤー情報を更新
		this.updatePlayerInfo();

		// ゲーム状態を更新
		this.updateGameStatus("Waiting for match to start...");

		// スコアボードを更新
		this.updateScoreboard();

		// キャンバスを初期化
		this.initializeCanvas();
	}

	private updatePlayerInfo(): void {
		const playerRoleElement = document.getElementById("player-role");
		if (playerRoleElement) {
			playerRoleElement.textContent = `${this.player1} vs ${this.player2}`;
		}
	}

	private updateGameStatus(status: string): void {
		const statusElement = document.getElementById("match-status");
		if (statusElement) {
			statusElement.textContent = status;
		}
	}

	private updateScoreboard(): void {
		const score1Element = document.getElementById("player1-score");
		const score2Element = document.getElementById("player2-score");

		if (score1Element)
			score1Element.textContent = this.gameState.score1.toString();
		if (score2Element)
			score2Element.textContent = this.gameState.score2.toString();
	}

	private initializeCanvas(): void {
		const canvas = document.getElementById("matchCanvas") as HTMLCanvasElement;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// キャンバスをクリア
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// 初期状態を描画
		this.drawGame(ctx, canvas);
	}

	private setupEventListeners(): void {
		// キーボードイベント
		document.addEventListener("keydown", this.handleKeyDownRef);
		document.addEventListener("keyup", this.handleKeyUpRef);

		// ボタンイベント
		const upButton = document.getElementById("button-up");
		const downButton = document.getElementById("button-down");
		if (upButton) {
			upButton.addEventListener("mousedown", () => this.startMoving("up"));
			upButton.addEventListener("mouseup", () => this.stopMoving("up"));
			upButton.addEventListener("mouseleave", () => this.stopMoving("up"));
		}

		if (downButton) {
			downButton.addEventListener("mousedown", () => this.startMoving("down"));
			downButton.addEventListener("mouseup", () => this.stopMoving("down"));
			downButton.addEventListener("mouseleave", () => this.stopMoving("down"));
		}
	}

	private handleKeyDown(event: KeyboardEvent): void {
		// プレイヤー1の操作
		if (KEY_BINDINGS.PLAYER1_UP.includes(event.key as "ArrowUp" | "w")) {
			event.preventDefault();
			this.player1MovingUp = true;
		} else if (KEY_BINDINGS.PLAYER1_DOWN.includes(event.key as "ArrowDown" | "s")) {
			event.preventDefault();
			this.player1MovingDown = true;
		}
		// プレイヤー2の操作
		else if (KEY_BINDINGS.PLAYER2_UP.includes(event.key as "ArrowLeft" | "a")) {
			event.preventDefault();
			this.player2MovingUp = true;
		} else if (KEY_BINDINGS.PLAYER2_DOWN.includes(event.key as "ArrowRight" | "d")) {
			event.preventDefault();
			this.player2MovingDown = true;
		}
	}

	private handleKeyUp(event: KeyboardEvent): void {
		// プレイヤー1の操作
		if (KEY_BINDINGS.PLAYER1_UP.includes(event.key as "ArrowUp" | "w")) {
			event.preventDefault();
			this.player1MovingUp = false;
		} else if (KEY_BINDINGS.PLAYER1_DOWN.includes(event.key as "ArrowDown" | "s")) {
			event.preventDefault();
			this.player1MovingDown = false;
		}
		// プレイヤー2の操作
		else if (KEY_BINDINGS.PLAYER2_UP.includes(event.key as "ArrowLeft" | "a")) {
			event.preventDefault();
			this.player2MovingUp = false;
		} else if (KEY_BINDINGS.PLAYER2_DOWN.includes(event.key as "ArrowRight" | "d")) {
			event.preventDefault();
			this.player2MovingDown = false;
		}
	}

	private startMoving(direction: "up" | "down"): void {
		if (direction === "up") {
			this.player1MovingUp = true;
		} else if (direction === "down") {
			this.player1MovingDown = true;
		}
	}

	private stopMoving(direction: "up" | "down"): void {
		if (direction === "up") {
			this.player1MovingUp = false;
		} else if (direction === "down") {
			this.player1MovingDown = false;
		}
	}

	private startGame(): void {
		// ゲストモードでは即座にゲームを開始
		this.gameState.gameStatus = "playing";
		this.updateGameStatus("Game in progress...");
		this.startGameLoop();
	}

	private startGameLoop(): void {
		if (this.gameLoopInterval) {
			clearInterval(this.gameLoopInterval);
		}

		this.gameLoopInterval = setInterval(() => {
			if (this.gameState.gameStatus === "playing") {
				this.updateGame();
				this.renderGame();
			}
		}, 16); // 約60FPS
	}

	private updateGame(): void {
		// プレイヤー1（左側）のパドル移動
		if (
			this.player1MovingUp &&
			this.gameState.paddle1Y > CONSTANTS.PADDLE_MIN_Y
		) {
			this.gameState.paddle1Y -= CONSTANTS.PADDLE_SPEED;
		}
		if (
			this.player1MovingDown &&
			this.gameState.paddle1Y < CONSTANTS.PADDLE_MAX_Y
		) {
			this.gameState.paddle1Y += CONSTANTS.PADDLE_SPEED;
		}

		// プレイヤー2（右側）のパドル移動
		if (
			this.player2MovingUp &&
			this.gameState.paddle2Y > CONSTANTS.PADDLE_MIN_Y
		) {
			this.gameState.paddle2Y -= CONSTANTS.PADDLE_SPEED;
		}
		if (
			this.player2MovingDown &&
			this.gameState.paddle2Y < CONSTANTS.PADDLE_MAX_Y
		) {
			this.gameState.paddle2Y += CONSTANTS.PADDLE_SPEED;
		}

		// ボールの移動
		this.gameState.ballX += this.gameState.ballSpeedX;
		this.gameState.ballY += this.gameState.ballSpeedY;

		// ボールとパドルの衝突判定
		this.checkPaddleCollision();

		// ボールと壁の衝突判定
		this.checkWallCollision();

		// スコア判定
		this.checkScore();
	}

	private checkPaddleCollision(): void {
		const canvas = document.getElementById("matchCanvas") as HTMLCanvasElement;
		if (!canvas) return;

		// 左パドルとの衝突
		if (
			this.gameState.ballX - CONSTANTS.BALL_RADIUS <=
				CONSTANTS.PADDLE_MARGIN + CONSTANTS.PADDLE_WIDTH &&
			this.gameState.ballX - CONSTANTS.BALL_RADIUS >= CONSTANTS.PADDLE_MARGIN &&
			this.gameState.ballY >= this.gameState.paddle1Y &&
			this.gameState.ballY <=
				this.gameState.paddle1Y + CONSTANTS.PADDLE_HEIGHT &&
			this.gameState.ballSpeedX < 0
		) {
			this.gameState.ballSpeedX = -this.gameState.ballSpeedX;
			// パドルの位置に応じてボールの角度を調整
			const hitPos =
				(this.gameState.ballY - this.gameState.paddle1Y) /
				CONSTANTS.PADDLE_HEIGHT;
			this.gameState.ballSpeedY = (hitPos - 0.5) * 10;
		}

		// 右パドルとの衝突
		if (
			this.gameState.ballX + CONSTANTS.BALL_RADIUS >=
				canvas.width - CONSTANTS.PADDLE_MARGIN - CONSTANTS.PADDLE_WIDTH &&
			this.gameState.ballX + CONSTANTS.BALL_RADIUS <=
				canvas.width - CONSTANTS.PADDLE_MARGIN &&
			this.gameState.ballY >= this.gameState.paddle2Y &&
			this.gameState.ballY <=
				this.gameState.paddle2Y + CONSTANTS.PADDLE_HEIGHT &&
			this.gameState.ballSpeedX > 0
		) {
			this.gameState.ballSpeedX = -this.gameState.ballSpeedX;
			// パドルの位置に応じてボールの角度を調整
			const hitPos =
				(this.gameState.ballY - this.gameState.paddle2Y) /
				CONSTANTS.PADDLE_HEIGHT;
			this.gameState.ballSpeedY = (hitPos - 0.5) * 10;
		}
	}

	private checkWallCollision(): void {
		const canvas = document.getElementById("matchCanvas") as HTMLCanvasElement;
		if (!canvas) return;

		// 上下の壁との衝突
		if (
			this.gameState.ballY - CONSTANTS.BALL_RADIUS <= 0 ||
			this.gameState.ballY + CONSTANTS.BALL_RADIUS >= canvas.height
		) {
			this.gameState.ballSpeedY = -this.gameState.ballSpeedY;
		}
	}

	private checkScore(): void {
		const canvas = document.getElementById("matchCanvas") as HTMLCanvasElement;
		if (!canvas) return;

		// 左側のゴール
		if (this.gameState.ballX < 0) {
			this.gameState.score2++;
			this.resetBall();
			this.updateScoreboard();
		}
		// 右側のゴール
		else if (this.gameState.ballX > canvas.width) {
			this.gameState.score1++;
			this.resetBall();
			this.updateScoreboard();
		}

		// ゲーム終了判定（先に1点取った方が勝ち）
		if (this.gameState.score1 >= 1 || this.gameState.score2 >= 1) {
			this.endGame();
		}
	}

	private resetBall(): void {
		const canvas = document.getElementById("matchCanvas") as HTMLCanvasElement;
		if (!canvas) return;

		this.gameState.ballX = canvas.width / 2;
		this.gameState.ballY = canvas.height / 2;
		this.gameState.ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * 5;
		this.gameState.ballSpeedY = (Math.random() - 0.5) * 6;
	}

	private endGame(): void {
		this.gameState.gameStatus = "finished";

		const winner =
			this.gameState.score1 > this.gameState.score2
				? this.player1
				: this.player2;
		this.gameState.winner = winner;

		this.updateGameStatus(`Game finished! Winner: ${winner}`);

		if (this.gameLoopInterval) {
			clearInterval(this.gameLoopInterval);
			this.gameLoopInterval = null;
		}

		// 3秒後にトーナメントページに戻る（グローバル状態にマッチ結果を保存）
		setTimeout(async () => {
			// グローバル状態にマッチ結果を保存
			const { TournamentStateManager } = await import(
				"../../tournament_guest/ui/tournamentState.js"
			);
			const stateManager = TournamentStateManager.getInstance();

			console.log("マッチ結果を保存します:", {
				matchId: this.matchId,
				winner: winner,
				score1: this.gameState.score1,
				score2: this.gameState.score2,
			});

			stateManager.setPendingMatchResult(
				this.matchId || "",
				winner,
				this.gameState.score1,
				this.gameState.score2,
			);

			// 現在のマッチ情報をクリア
			stateManager.clearCurrentMatch();

			// クリーンなURLでトーナメントページに戻る
			navigate("/tournament_guest");
		}, 3000);
	}

	private renderGame(): void {
		const canvas = document.getElementById("matchCanvas") as HTMLCanvasElement;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		this.drawGame(ctx, canvas);
	}

	private drawGame(
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
	): void {
		// 背景をクリア
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// 中央線を描画
		ctx.strokeStyle = "#fff";
		ctx.setLineDash([10, 10]);
		ctx.beginPath();
		ctx.moveTo(canvas.width / 2, 0);
		ctx.lineTo(canvas.width / 2, canvas.height);
		ctx.stroke();
		ctx.setLineDash([]);

		// 左パドルを描画
		ctx.fillStyle = "#fff";
		ctx.fillRect(
			CONSTANTS.PADDLE_MARGIN,
			this.gameState.paddle1Y,
			CONSTANTS.PADDLE_WIDTH,
			CONSTANTS.PADDLE_HEIGHT,
		);

		// 右パドルを描画
		ctx.fillRect(
			canvas.width - CONSTANTS.PADDLE_MARGIN - CONSTANTS.PADDLE_WIDTH,
			this.gameState.paddle2Y,
			CONSTANTS.PADDLE_WIDTH,
			CONSTANTS.PADDLE_HEIGHT,
		);

		// ボールを描画
		ctx.beginPath();
		ctx.arc(
			this.gameState.ballX,
			this.gameState.ballY,
			CONSTANTS.BALL_RADIUS,
			0,
			Math.PI * 2,
		);
		ctx.fill();

		// スコアを描画
		ctx.fillStyle = "#fff";
		ctx.font = CONSTANTS.FONT_SIZE_LARGE;
		ctx.textAlign = "center";
		ctx.fillText(this.gameState.score1.toString(), canvas.width / 4, 100);
		ctx.fillText(this.gameState.score2.toString(), (canvas.width * 3) / 4, 100);

		// プレイヤー名を描画
		ctx.font = CONSTANTS.FONT_SIZE_MEDIUM;
		ctx.fillText(this.player1, canvas.width / 4, 150);
		ctx.fillText(this.player2, (canvas.width * 3) / 4, 150);
	}

	private handleError(message: string, redirectPath: string): void {
		console.error(message);
		alert(message);
		navigate(redirectPath);
	}

	public destroy(): void {
		if (this.isDestroyed) return;
		this.isDestroyed = true;

		// イベントリスナーを削除
		document.removeEventListener("keydown", this.handleKeyDownRef);
		document.removeEventListener("keyup", this.handleKeyUpRef);

		// アニメーションループを停止
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		if (this.gameLoopInterval) {
			clearInterval(this.gameLoopInterval);
			this.gameLoopInterval = null;
		}

		console.log("GuestMatchController destroyed");
	}
}
