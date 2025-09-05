import { matchAPI, type RealtimeMatchStateDto } from "../api/api";

export class MatchController {
	private matchId: string | null = null;
	private animationFrameId: number | null = null;

	// ゲームの状態とUI要素
	private serverState: RealtimeMatchStateDto | null = null;
	private myPredictedPaddleY: number = 300;
	private myPlayerNumber: "player1" | "player2" | null = null;
	private movingUp: boolean = false;
	private movingDown: boolean = false;

	// キーボードイベントのハンドラをクラスのプロパティとして保持
	private handleKeyDownRef: (e: KeyboardEvent) => void;
	private handleKeyUpRef: (e: KeyboardEvent) => void;

	constructor(params?: { [key: string]: string }) {
		if (params && params.matchId) {
			this.matchId = params.matchId;
		}
		this.handleKeyDownRef = this.handleKeyDown.bind(this);
		this.handleKeyUpRef = this.handleKeyUp.bind(this);
	}

	public render(): void {
		this.runMatch();
	}

	private runMatch(): void {
		if (!this.matchId) {
			alert("Match ID is missing. Cannot start match.");
			window.location.pathname = "/";
			return;
		}

		this.myPredictedPaddleY = 300;

		// 他のページに移動した際にリソースをクリーンアップするためのイベントリスナー
		window.addEventListener("popstate", this.cleanup.bind(this), {
			once: true,
		});

		this.connectToMatch();
		this.setupEventListeners();
		this.initializeReadyButton();
		this.matchLoop();
	}

	private cleanup(): void {
		console.log("Cleaning up match resources...");
		matchAPI.destroy();
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		window.removeEventListener("keydown", this.handleKeyDownRef);
		window.removeEventListener("keyup", this.handleKeyUpRef);
	}

	private async connectToMatch(): Promise<void> {
		const matchId = this.matchId;
		const token = localStorage.getItem("accessToken");

		if (!token) {
			alert("Token not found. Please login.");
			window.location.pathname = "/auth/login";
			return;
		}

		try {
			const payload = JSON.parse(atob(token.split(".")[1]));
			const userId = payload.id;

			// マッチにサブスクライブ（バックエンドのstartアクションを使用）
			matchAPI.subscribeToMatch(matchId!, userId);

			console.log("Match WebSocket connection established.");
		} catch (error) {
			console.error("WebSocket接続エラー:", error);
			alert("WebSocket接続に失敗しました。");
		}
	}

	private handleKeyDown(e: KeyboardEvent): void {
		if (e.key === "ArrowUp" || e.key.toLowerCase() === "w")
			this.movingUp = true;
		if (e.key === "ArrowDown" || e.key.toLowerCase() === "s")
			this.movingDown = true;
	}

	private handleKeyUp(e: KeyboardEvent): void {
		if (e.key === "ArrowUp" || e.key.toLowerCase() === "w")
			this.movingUp = false;
		if (e.key === "ArrowDown" || e.key.toLowerCase() === "s")
			this.movingDown = false;
	}

	private setupEventListeners(): void {
		const btnUp = document.getElementById("button-up");
		const btnDown = document.getElementById("button-down");
		const readyButton = document.getElementById("ready-button");

		if (!btnUp || !btnDown) return;

		// ボタン操作
		btnUp.addEventListener("mousedown", () => {
			this.movingUp = true;
		});
		btnUp.addEventListener("mouseup", () => {
			this.movingUp = false;
		});
		btnUp.addEventListener("mouseleave", () => {
			this.movingUp = false;
		});

		btnDown.addEventListener("mousedown", () => {
			this.movingDown = true;
		});
		btnDown.addEventListener("mouseup", () => {
			this.movingDown = false;
		});
		btnDown.addEventListener("mouseleave", () => {
			this.movingDown = false;
		});

		// Readyボタン操作
		if (readyButton) {
			readyButton.addEventListener("click", () => {
				this.handleReadyButtonClick();
			});
		}

		// キーボード操作
		window.addEventListener("keydown", this.handleKeyDownRef);
		window.addEventListener("keyup", this.handleKeyUpRef);
	}

	private updateMyPaddle(): void {
		const PADDLE_SPEED = 7;
		let hasMoved = false;

		if (this.movingUp) {
			this.myPredictedPaddleY -= PADDLE_SPEED;
			hasMoved = true;
		}
		if (this.movingDown) {
			this.myPredictedPaddleY += PADDLE_SPEED;
			hasMoved = true;
		}

		this.myPredictedPaddleY = Math.max(
			50,
			Math.min(600 - 50, this.myPredictedPaddleY),
		);

		if (hasMoved) {
			matchAPI.sendPaddleMove({ y: this.myPredictedPaddleY });
		}
	}

	private matchLoop(): void {
		this.updateMyPaddle();
		this.updateMatchState();
		this.updateReadyButton();
		this.updateReadyCount();
		this.draw();
		this.animationFrameId = requestAnimationFrame(this.matchLoop.bind(this));
	}

	private updateMatchState(): void {
		// APIから最新のマッチ状態を取得
		this.serverState = matchAPI.getMatchData();
		
		// プレイヤーの役割を更新
		if (this.serverState && this.myPlayerNumber === null) {
			const role = matchAPI.getPlayerRole();
			if (role === "player1" || role === "player2") {
				this.myPlayerNumber = role;
				this.updatePlayerInfo();
			}
			// マッチデータが受信されたらreadyボタンを更新
			this.updateReadyButton();
		}

		// マッチの状態を更新
		this.updateMatchStatus();
	}

	private updatePlayerInfo(): void {
		const playerRoleEl = document.getElementById("player-role");
		if (playerRoleEl) {
			playerRoleEl.textContent = this.myPlayerNumber || "Unknown";
		}
	}

	private updateMatchStatus(): void {
		const matchStatusEl = document.getElementById("match-status");
		if (matchStatusEl) {
			const status = matchAPI.getMatchStatus();
			matchStatusEl.textContent = status ? `Status: ${status}` : "Waiting for match to start...";
		}
	}

	private handleReadyButtonClick(): void {
		matchAPI.toggleReadyState();
		this.updateReadyButton();
		this.updateReadyCount();
	}

	private updateReadyButton(): void {
		const readyButton = document.getElementById("ready-button") as HTMLButtonElement;
		if (!readyButton) return;

		const isReady = matchAPI.isCurrentUserReady();
		const readyCount = matchAPI.getReadyPlayerCount();
		const playerRole = matchAPI.getPlayerRole();

		// マッチデータがまだ受信されていない場合
		if (!this.serverState) {
			readyButton.disabled = true;
			readyButton.textContent = "Connecting...";
			readyButton.classList.remove("ready");
			return;
		}

		// 観戦者の場合はボタンを無効化
		if (playerRole === "spectator") {
			readyButton.disabled = true;
			readyButton.textContent = "Spectator";
			readyButton.classList.remove("ready");
			return;
		}

		if (isReady) {
			readyButton.textContent = "Ready!";
			readyButton.classList.add("ready");
		} else {
			readyButton.textContent = "Ready";
			readyButton.classList.remove("ready");
		}

		// 2人とも準備完了の場合はボタンを無効化
		readyButton.disabled = readyCount >= 2;
	}

	private updateReadyCount(): void {
		const readyCountEl = document.getElementById("ready-count");
		if (readyCountEl) {
			const readyCount = matchAPI.getReadyPlayerCount();
			readyCountEl.textContent = readyCount.toString();
		}
	}

	private initializeReadyButton(): void {
		const readyButton = document.getElementById("ready-button") as HTMLButtonElement;
		if (readyButton) {
			readyButton.disabled = true; // マッチデータ受信まで無効化
			readyButton.textContent = "Connecting...";
		}
		this.updateReadyCount();
	}

	private draw(): void {
		const canvas = document.getElementById("matchCanvas") as HTMLCanvasElement;
		const ctx = canvas?.getContext("2d");
		if (!ctx) return;

		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		if (!this.serverState) {
			ctx.fillStyle = "white";
			ctx.font = "24px Arial";
			ctx.textAlign = "center";
			ctx.fillText(
				"Connecting to server...",
				canvas.width / 2,
				canvas.height / 2,
			);
			return;
		}

		const state = this.serverState;
		const score1El = document.getElementById("player1-score");
		const score2El = document.getElementById("player2-score");
		if (score1El) score1El.textContent = state.scores.player1.toString();
		if (score2El) score2El.textContent = state.scores.player2.toString();

		ctx.fillStyle = "white";
		const serverP1Y = state.paddles.player1.y;
		const serverP2Y = state.paddles.player2.y;

		// プレイヤー1のパドルを描画
		if (this.myPlayerNumber === "player1") {
			ctx.fillRect(10, this.myPredictedPaddleY - 50, 10, 100);
		} else {
			ctx.fillRect(10, serverP1Y - 50, 10, 100);
		}

		// プレイヤー2のパドルを描画
		if (this.myPlayerNumber === "player2") {
			ctx.fillRect(canvas.width - 20, this.myPredictedPaddleY - 50, 10, 100);
		} else {
			ctx.fillRect(canvas.width - 20, serverP2Y - 50, 10, 100);
		}

		// ボールを描画
		ctx.beginPath();
		ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
		ctx.fill();

		// ゲーム終了時の表示
		if (state.status === "finished") {
			ctx.font = "50px Arial";
			ctx.textAlign = "center";
			ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
		}
	}
}
