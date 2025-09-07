import { navigate } from "../../../app/routing";
import { MatchAPI, type RealtimeMatchStateDto } from "../api/api";

// 定数定義
const CONSTANTS = {
	PADDLE_SPEED: 5,
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
	UP: ["ArrowUp", "w"],
	DOWN: ["ArrowDown", "s"],
} as const;

export class MatchController {
	private matchId: string | null = null;
	private roomId: string | null = null;
	private userId: string | null = null;
	private animationFrameId: number | null = null;
	private serverState: RealtimeMatchStateDto | null = null;
	private myPredictedPaddleY: number = CONSTANTS.INITIAL_PADDLE_Y;
	private myPlayerNumber: "player1" | "player2" | null = null;
	private movingUp: boolean = false;
	private movingDown: boolean = false;

	// 位置修正のためのプロパティ
	private correctionThreshold: number = 3; // 閾値を下げてより敏感に修正
	private correctionCount: number = 0;
	private lastCorrectionTime: number = 0;
	private correctionCooldown: number = 50; // 50msのクールダウン
	private handleKeyDownRef: (e: KeyboardEvent) => void;
	private handleKeyUpRef: (e: KeyboardEvent) => void;
	private matchAPI = new MatchAPI();

	constructor(params?: { [key: string]: string }) {
		console.log("[DEBUG] MatchController constructor called", params);
		if (params) {
			this.matchId = params.matchId || null;
			this.roomId = params.roomId || null;
		}
		this.userId = this.getUserId();
		this.handleKeyDownRef = this.handleKeyDown.bind(this);
		this.handleKeyUpRef = this.handleKeyUp.bind(this);
		console.log("[DEBUG] MatchController constructor completed");
	}

	public async render(): Promise<void> {
		await this.runMatch();
	}

	private async runMatch(): Promise<void> {
		try {
			if (!this.matchId) {
				this.handleError("Match ID is missing. Cannot start match.", "/");
				return;
			}

			// DOM要素の準備完了を待機
			await this.waitForDOMElements();

			// WebSocket接続を確保
			await this.ensureWebSocketConnection();

			// 少し待ってからマッチデータを取得
			await new Promise((resolve) => setTimeout(resolve, 500));

			this.initializeMatchState();
			this.setupMatchAPI();
			this.setupEventListeners();
			this.matchLoop();
		} catch (error) {
			this.handleError("Failed to start match", "/");
			console.error("Match initialization error:", error);
		}
	}

	// DOM要素の準備完了を待機
	private async waitForDOMElements(): Promise<void> {
		return new Promise((resolve, reject) => {
			let retryCount = 0;
			const maxRetries = 50; // 5秒間待機
			const retryDelay = 100;

			const checkElements = () => {
				const canvas = document.getElementById(
					"matchCanvas",
				) as HTMLCanvasElement;
				const readyButton = document.getElementById("ready-button");
				const scoreboard = document.getElementById("scoreboard");

				if (canvas && readyButton && scoreboard) {
					// Canvas context の取得も確認
					const ctx = canvas.getContext("2d");
					if (ctx) {
						console.log("All DOM elements are ready");
						resolve();
						return;
					}
				}

				if (retryCount >= maxRetries) {
					console.error("DOM elements timeout - retry count:", retryCount);
					reject(new Error("必要なDOM要素の準備に失敗しました。"));
				} else {
					retryCount++;
					console.log(
						`Waiting for DOM elements... (${retryCount}/${maxRetries})`,
					);
					setTimeout(checkElements, retryDelay);
				}
			};
			checkElements();
		});
	}

	// WebSocket接続を確保する（必要に応じて再接続）
	private async ensureWebSocketConnection(): Promise<void> {
		const wsManager = this.matchAPI["wsManager"];

		// roomIdが取得できない場合はエラー
		if (!this.roomId) {
			throw new Error("Room ID is required for match page");
		}

		// userIdが取得できない場合はエラー
		if (!this.userId) {
			throw new Error("User ID is required for match page");
		}

		// 既に同じルームに接続済みの場合は何もしない
		if (
			wsManager.isConnected() &&
			wsManager.getCurrentRoomId() === this.roomId
		) {
			console.log(`Already connected to room ${this.roomId} for match`);
			return;
		}

		console.log(`Connecting to room ${this.roomId} for match`);

		try {
			await wsManager.connect(this.roomId);
			console.log("WebSocket connection established for match");
		} catch (error) {
			console.error("Failed to connect to WebSocket for match:", error);
			throw error;
		}
	}

	// ユーザーIDを取得
	private getUserId(): string | null {
		try {
			const token = localStorage.getItem("accessToken");
			if (!token) {
				console.error("アクセストークンが見つかりません");
				return null;
			}

			// JWTトークンをデコードしてユーザーIDを取得
			const payload = JSON.parse(atob(token.split(".")[1]));
			return payload.id || null;
		} catch (error) {
			console.error("ユーザーIDの取得に失敗しました:", error);
			return null;
		}
	}

	private initializeMatchState(): void {
		this.myPredictedPaddleY = CONSTANTS.INITIAL_PADDLE_Y;
		this.correctionCount = 0;
		this.serverState = null;
		this.myPlayerNumber = null;
	}

	private setupMatchAPI(): void {
		// matchIdを設定
		if (this.matchId) {
			this.matchAPI.setMatchId(this.matchId);
		}

		// コールバックを設定
		this.matchAPI.setCallback(this.handleMatchEvent.bind(this));

		// ページ離脱時のクリーンアップを設定
		window.addEventListener("popstate", this.cleanup.bind(this), {
			once: true,
		});

		// WebSocket接続を開始
		this.connectToMatch();
	}

	private cleanup(): void {
		try {
			console.log("[DEBUG] MatchController.cleanup() called");
			// WebSocket接続とコールバックをクリーンアップ
			this.matchAPI.removeCallback();
			this.matchAPI.destroy();

			// アニメーションフレームをキャンセル
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}

			// イベントリスナーを削除
			this.removeEventListeners();
			console.log("[DEBUG] MatchController.cleanup() completed");
		} catch (error) {
			console.error("Cleanup error:", error);
		}
	}

	private removeEventListeners(): void {
		window.removeEventListener("keydown", this.handleKeyDownRef);
		window.removeEventListener("keyup", this.handleKeyUpRef);
	}

	private handleError(message: string, redirectPath: string = "/"): void {
		alert(message);
		window.location.pathname = redirectPath;
	}

	private handleRoomDeleted(data: any): void {
		// ルーム削除時の処理
		const reason = data?.reason || "unknown";
		const message = data?.message || "Room has been deleted.";

		console.log(`Match room deleted - Reason: ${reason}, Message: ${message}`);

		// ユーザーに通知を表示
		this.showRoomDeletedNotification(message);

		// 3秒後にロビーページにナビゲート
		setTimeout(() => {
			navigate("/lobby");
		}, 3000);
	}

	private handleForceLobby(data: any): void {
		// 強制的にlobbyに戻す処理
		const reason = data?.reason || "unknown";
		const message =
			data?.message ||
			"A user has been disconnected for too long. Returning to lobby.";

		console.log(`Match force lobby - Reason: ${reason}, Message: ${message}`);

		// ユーザーに通知を表示
		this.showForceLobbyNotification(message);

		// 3秒後にロビーページにナビゲート
		setTimeout(() => {
			navigate("/lobby");
		}, 3000);
	}

	private showRoomDeletedNotification(message: string): void {
		try {
			// キャンバス上に通知を表示
			const canvas = document.getElementById(
				"matchCanvas",
			) as HTMLCanvasElement;
			if (canvas) {
				const ctx = canvas.getContext("2d");
				if (ctx) {
					// キャンバスをクリア
					ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
					ctx.fillRect(0, 0, canvas.width, canvas.height);

					// 通知メッセージを表示
					ctx.fillStyle = "#f8d7da";
					ctx.fillRect(50, 200, canvas.width - 100, 200);

					ctx.fillStyle = "#721c24";
					ctx.font = "24px Arial";
					ctx.textAlign = "center";
					ctx.fillText("⚠️ ルームが削除されました", canvas.width / 2, 250);
					ctx.fillText(message, canvas.width / 2, 280);
					ctx.fillText("3秒後にロビーに戻ります...", canvas.width / 2, 320);
				}
			}

			// ボタンを無効化
			const readyButton = document.getElementById(
				"ready-button",
			) as HTMLButtonElement;
			if (readyButton) {
				readyButton.disabled = true;
				readyButton.textContent = "Room Deleted";
			}
		} catch (error) {
			console.error("マッチ画面でのルーム削除通知の表示に失敗:", error);
		}
	}

	private showForceLobbyNotification(message: string): void {
		try {
			const modal = this.createModal(
				"force-lobby-modal",
				`
					<div class="force-lobby-content">
						<h2>🔌 接続が切断されました</h2>
						<p>${message}</p>
						<p>3秒後にロビーに戻ります...</p>
					</div>
				`,
				{
					position: "fixed",
					top: "0",
					left: "0",
					width: "100%",
					height: "100%",
					background: "rgba(0, 0, 0, 0.8)",
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					zIndex: "10000",
				},
			);

			// スタイルを追加
			const style = document.createElement("style");
			style.textContent = `
				.force-lobby-content {
					background: #fff3cd;
					color: #856404;
					padding: 2rem;
					border-radius: 10px;
					text-align: center;
					box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
					border: 1px solid #ffeaa7;
				}
			`;
			document.head.appendChild(style);

			document.body.appendChild(modal);
			this.autoRemoveModal(modal, 3000);
		} catch (error) {
			console.error("マッチ画面での強制lobby通知の表示に失敗:", error);
		}
	}

	private async connectToMatch(): Promise<void> {
		try {
			const token = localStorage.getItem("accessToken");
			if (!token) {
				this.handleError("Token not found. Please login.", "/auth/login");
				return;
			}

			const payload = JSON.parse(atob(token.split(".")[1]));
			if (!payload.id) {
				this.handleError("Invalid token format.", "/auth/login");
				return;
			}

			console.log("[DEBUG] connectToMatch - Sending match start request...");
			this.matchAPI.sendMatchStart();

			// マッチデータの受信を待機
			console.log("[DEBUG] connectToMatch - Waiting for match data...");
			await this.waitForMatchData();
			console.log("[DEBUG] connectToMatch - Match data received successfully");
		} catch (error) {
			console.error("[DEBUG] connectToMatch - WebSocket接続エラー:", error);
			this.handleError("WebSocket接続に失敗しました。");
		}
	}

	// マッチデータの受信を待機
	private async waitForMatchData(): Promise<void> {
		return new Promise((resolve, reject) => {
			let dataRetryCount = 0;
			const maxDataRetries = 50; // 5秒間待機
			const dataRetryDelay = 100;

			const checkData = () => {
				const matchData = this.matchAPI.getMatchData();
				console.log(
					`[DEBUG] waitForMatchData - Attempt ${dataRetryCount + 1}: matchData =`,
					matchData,
				);
				console.log(
					`[DEBUG] waitForMatchData - WebSocket connected:`,
					this.matchAPI["wsManager"]?.isConnected(),
				);
				console.log(
					`[DEBUG] waitForMatchData - Match status:`,
					this.matchAPI.getMatchStatus(),
				);

				if (matchData) {
					console.log(
						"[DEBUG] waitForMatchData - Match data received:",
						matchData,
					);
					resolve();
				} else if (dataRetryCount >= maxDataRetries) {
					console.error(
						"[DEBUG] waitForMatchData - Match data timeout - retry count:",
						dataRetryCount,
					);
					reject(new Error("マッチデータの取得に失敗しました。"));
				} else {
					dataRetryCount++;
					console.log(
						`[DEBUG] waitForMatchData - Waiting for match data... (${dataRetryCount}/${maxDataRetries})`,
					);
					setTimeout(checkData, dataRetryDelay);
				}
			};
			checkData();
		});
	}

	private handleMatchEvent(data: any, action?: string): void {
		if (action === "match_finished") {
			// マッチ終了時にroomIdを含めてトーナメントページに遷移
			navigate(`/tournament/${this.roomId}`);
		} else if (action === "room_deleted") {
			// ルーム削除時の処理
			console.log("Match room deleted:", data);
			this.handleRoomDeleted(data);
		} else if (action === "force_lobby") {
			// 強制的にlobbyに戻す処理
			console.log("Match force lobby:", data);
			this.handleForceLobby(data);
		}
	}

	private handleKeyDown(e: KeyboardEvent): void {
		const key = e.key.toLowerCase();
		if (KEY_BINDINGS.UP.includes(key as any)) this.movingUp = true;
		if (KEY_BINDINGS.DOWN.includes(key as any)) this.movingDown = true;
	}

	private handleKeyUp(e: KeyboardEvent): void {
		const key = e.key.toLowerCase();
		if (KEY_BINDINGS.UP.includes(key as any)) this.movingUp = false;
		if (KEY_BINDINGS.DOWN.includes(key as any)) this.movingDown = false;
	}

	private setupEventListeners(): void {
		this.setupPaddleButtons();
		this.setupReadyButton();
		this.setupKeyboardListeners();
	}

	private setupPaddleButtons(): void {
		const btnUp = document.getElementById("button-up");
		const btnDown = document.getElementById("button-down");

		if (!btnUp || !btnDown) {
			console.warn("Paddle buttons not found in DOM");
			return;
		}

		this.addPaddleButtonListeners(btnUp, "up");
		this.addPaddleButtonListeners(btnDown, "down");
	}

	private addPaddleButtonListeners(
		button: HTMLElement,
		direction: "up" | "down",
	): void {
		const setMoving = (moving: boolean) => {
			if (direction === "up") {
				this.movingUp = moving;
			} else {
				this.movingDown = moving;
			}
		};

		button.addEventListener("mousedown", () => setMoving(true));
		button.addEventListener("mouseup", () => setMoving(false));
		button.addEventListener("mouseleave", () => setMoving(false));
	}

	private setupReadyButton(): void {
		const readyButton = document.getElementById("ready-button");
		if (readyButton) {
			readyButton.addEventListener("click", () =>
				this.handleReadyButtonClick(),
			);
		} else {
			console.warn("Ready button not found in DOM during setup");
		}
	}

	private setupKeyboardListeners(): void {
		window.addEventListener("keydown", this.handleKeyDownRef);
		window.addEventListener("keyup", this.handleKeyUpRef);
	}

	private updateMyPaddle(): void {
		let hasMoved = false;

		if (this.movingUp) {
			this.myPredictedPaddleY -= CONSTANTS.PADDLE_SPEED;
			hasMoved = true;
		}
		if (this.movingDown) {
			this.myPredictedPaddleY += CONSTANTS.PADDLE_SPEED;
			hasMoved = true;
		}

		// パドルの位置を制限
		this.myPredictedPaddleY = Math.max(
			CONSTANTS.PADDLE_MIN_Y,
			Math.min(CONSTANTS.PADDLE_MAX_Y, this.myPredictedPaddleY),
		);

		if (hasMoved) {
			this.matchAPI.sendPaddleMove({ y: this.myPredictedPaddleY });
		}
	}

	private matchLoop(): void {
		const canvas = document.getElementById("matchCanvas");
		if (!canvas) {
			console.warn("Canvas element missing, skipping match loop iteration");
			setTimeout(() => {
				this.animationFrameId = requestAnimationFrame(
					this.matchLoop.bind(this),
				);
			}, 100);
			return;
		}

		this.updateMyPaddle();
		this.updateMatchState();
		this.draw();

		// 60fpsで実行（パフォーマンス向上）
		this.animationFrameId = requestAnimationFrame(this.matchLoop.bind(this));
	}

	private updateMatchState(): void {
		const newServerState = this.matchAPI.getMatchData();

		// 新しい状態が有効な場合のみ更新
		if (newServerState) {
			// サーバー位置との整合性チェック
			if (this.serverState && this.myPlayerNumber) {
				this.checkAndCorrectPosition(newServerState);
			}

			// 状態を更新
			this.serverState = newServerState;

			// プレイヤーロールの初期化
			if (this.myPlayerNumber === null) {
				this.initializePlayerRole();
			}
		}

		// Ready buttonとUIの更新（必要に応じて）
		this.updateUI();
	}

	private initializePlayerRole(): void {
		const role = this.matchAPI.getPlayerRole();
		if (role === "player1" || role === "player2") {
			this.myPlayerNumber = role;
		}
	}

	private updateUI(): void {
		// Ready buttonの更新（必要に応じて）
		this.updateReadyButton();
		this.updateReadyCount();
		this.updateMatchStatus();
		this.updatePlayerInfo();
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
			const status = this.matchAPI.getMatchStatus();
			matchStatusEl.textContent = status
				? `Status: ${status}`
				: "Waiting for match to start...";
		}
	}

	/**
	 * サーバー位置との整合性をチェックし、必要に応じて位置を修正する
	 */
	private checkAndCorrectPosition(serverState: RealtimeMatchStateDto): void {
		const currentTime = Date.now();
		const serverPaddleY = this.getMyServerPaddleY(serverState);
		const error = Math.abs(this.myPredictedPaddleY - serverPaddleY);

		// クールダウン期間中は修正をスキップ
		if (currentTime - this.lastCorrectionTime < this.correctionCooldown) {
			return;
		}

		if (error > this.correctionThreshold) {
			this.correctionCount++;
			this.lastCorrectionTime = currentTime;

			// 滑らかな補間で位置を修正
			this.smoothCorrectPosition(serverPaddleY);
		}
	}

	/**
	 * 滑らかな位置補正を実行
	 */
	private smoothCorrectPosition(targetY: number): void {
		const error = targetY - this.myPredictedPaddleY;
		const correctionSpeed = 0.3; // 補正速度（0-1の間）

		// 段階的に位置を修正
		this.myPredictedPaddleY += error * correctionSpeed;
	}

	/**
	 * 自分のパドルのサーバー位置を取得
	 */
	private getMyServerPaddleY(serverState: RealtimeMatchStateDto): number {
		return this.myPlayerNumber === "player1"
			? serverState.paddles.player1.y
			: serverState.paddles.player2.y;
	}

	private handleReadyButtonClick(): void {
		const playerRole = this.matchAPI.getPlayerRole();
		if (playerRole === "spectator" || playerRole === null) {
			console.warn("Cannot set ready state: invalid player role");
			return;
		}

		if (
			this.serverState &&
			(this.serverState.status === "playing" ||
				this.serverState.status === "finished")
		) {
			console.warn("Cannot set ready state: match is not in scheduled state");
			return;
		}

		this.matchAPI.sendReady();
		this.updateReadyButton();
		this.updateReadyCount();
	}

	private updateReadyButton(): void {
		const readyButton = document.getElementById(
			"ready-button",
		) as HTMLButtonElement;
		if (!readyButton) {
			console.warn("Ready button not found in DOM");
			return;
		}

		const buttonState = this.getReadyButtonState();
		this.applyReadyButtonState(readyButton, buttonState);
	}

	private getReadyButtonState() {
		const isReady = this.matchAPI.isCurrentUserReady();
		const readyCount = this.matchAPI.getReadyPlayerCount();
		const playerRole = this.matchAPI.getPlayerRole();

		if (!this.serverState) {
			return {
				disabled: true,
				text: "Connecting...",
				hasReadyClass: false,
			};
		}

		if (playerRole === "spectator") {
			return {
				disabled: true,
				text: "Spectator",
				hasReadyClass: false,
			};
		}

		if (playerRole === null) {
			return {
				disabled: true,
				text: "Waiting for player role...",
				hasReadyClass: false,
			};
		}

		// マッチが既に開始されている場合は無効化
		if (
			this.serverState.status === "playing" ||
			this.serverState.status === "finished"
		) {
			return {
				disabled: true,
				text: this.serverState.status === "playing" ? "Playing..." : "Finished",
				hasReadyClass: false,
			};
		}

		return {
			disabled: readyCount >= 2,
			text: isReady ? "Ready!" : "Ready",
			hasReadyClass: isReady,
		};
	}

	private applyReadyButtonState(
		button: HTMLButtonElement,
		state: ReturnType<typeof this.getReadyButtonState>,
	): void {
		button.disabled = state.disabled;
		button.textContent = state.text;

		if (state.hasReadyClass) {
			button.classList.add("ready");
		} else {
			button.classList.remove("ready");
		}
	}

	private updateReadyCount(): void {
		const readyCountEl = document.getElementById("ready-count");
		if (readyCountEl) {
			const readyCount = this.matchAPI.getReadyPlayerCount();
			readyCountEl.textContent = readyCount.toString();
		}
	}

	private draw(): void {
		const canvas = document.getElementById("matchCanvas") as HTMLCanvasElement;
		if (!canvas) {
			console.warn("Canvas element not found in DOM");
			return;
		}

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			console.warn("Canvas context not available");
			return;
		}

		this.clearCanvas(ctx, canvas);

		// serverStateがnullの場合は接続メッセージを表示
		if (!this.serverState) {
			this.drawConnectionMessage(ctx, canvas);
			return;
		}

		this.updateScoreDisplay();
		this.drawGameElements(ctx, canvas);
	}

	private clearCanvas(
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
	): void {
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}

	private drawConnectionMessage(
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
	): void {
		ctx.fillStyle = "white";
		ctx.font = CONSTANTS.FONT_SIZE_MEDIUM;
		ctx.textAlign = "center";
		ctx.fillText(
			"Connecting to server...",
			canvas.width / 2,
			canvas.height / 2,
		);
	}

	private updateScoreDisplay(): void {
		if (!this.serverState) return;

		const score1El = document.getElementById("player1-score");
		const score2El = document.getElementById("player2-score");
		if (score1El)
			score1El.textContent = this.serverState.scores.player1.toString();
		if (score2El)
			score2El.textContent = this.serverState.scores.player2.toString();
	}

	private drawGameElements(
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
	): void {
		if (!this.serverState) return;

		ctx.fillStyle = "white";

		this.drawPaddles(ctx, canvas);
		this.drawBall(ctx);
		this.drawGameOverMessage(ctx, canvas);
	}

	private drawPaddles(
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
	): void {
		const { player1, player2 } = this.serverState!.paddles;

		// Player 1 paddle
		const p1Y =
			this.myPlayerNumber === "player1" ? this.myPredictedPaddleY : player1.y;
		this.drawPaddle(ctx, CONSTANTS.PADDLE_MARGIN, p1Y);

		// Player 2 paddle
		const p2Y =
			this.myPlayerNumber === "player2" ? this.myPredictedPaddleY : player2.y;
		this.drawPaddle(
			ctx,
			canvas.width - CONSTANTS.PADDLE_MARGIN - CONSTANTS.PADDLE_WIDTH,
			p2Y,
		);
	}

	private drawPaddle(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
	): void {
		ctx.fillRect(
			x,
			y - CONSTANTS.PADDLE_HEIGHT / 2,
			CONSTANTS.PADDLE_WIDTH,
			CONSTANTS.PADDLE_HEIGHT,
		);
	}

	private drawBall(ctx: CanvasRenderingContext2D): void {
		const { x, y } = this.serverState!.ball;
		ctx.beginPath();
		ctx.arc(x, y, CONSTANTS.BALL_RADIUS, 0, Math.PI * 2);
		ctx.fill();
	}

	private drawGameOverMessage(
		ctx: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
	): void {
		if (this.serverState!.status === "finished") {
			ctx.font = CONSTANTS.FONT_SIZE_LARGE;
			ctx.textAlign = "center";
			ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
		}
	}

	public destroy(): void {
		console.log("[DEBUG] MatchController.destroy() called");
		// アニメーションフレームを停止
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		// キーボードイベントリスナーを削除
		document.removeEventListener("keydown", this.handleKeyDownRef);
		document.removeEventListener("keyup", this.handleKeyUpRef);

		// MatchAPIのリソースをクリーンアップ
		if (this.matchAPI) {
			this.matchAPI.destroy();
		}

		// 全ての値を初期化
		this.resetAllValues();

		console.log("[DEBUG] MatchController destroyed");
	}

	// 全ての値を初期化
	private resetAllValues(): void {
		this.matchId = null;
		this.animationFrameId = null;
		this.serverState = null;
		this.myPredictedPaddleY = CONSTANTS.INITIAL_PADDLE_Y;
		this.correctionCount = 0;
		this.myPlayerNumber = null;
		this.movingUp = false;
		this.movingDown = false;
	}

	private createModal(
		className: string,
		innerHTML: string,
		styles: Record<string, string>,
	): HTMLElement {
		const modal = document.createElement("div");
		modal.className = className;
		modal.innerHTML = innerHTML;
		Object.assign(modal.style, styles);
		return modal;
	}

	private autoRemoveModal(modal: HTMLElement, delay: number): void {
		setTimeout(() => {
			if (modal.parentNode) {
				modal.parentNode.removeChild(modal);
			}
		}, delay);
	}
}
