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
	private animationFrameId: number | null = null;
	private serverState: RealtimeMatchStateDto | null = null;
	private myPredictedPaddleY: number = CONSTANTS.INITIAL_PADDLE_Y;
	private PlayerRole: "player1" | "player2" | "spectator" | null = null;
	private movingUp: boolean = false;
	private movingDown: boolean = false;

	// DOM要素の一元管理
	private canvas: HTMLCanvasElement | null = null;
	private readyButton: HTMLButtonElement | null = null;
	private playerRoleEl: HTMLElement | null = null;
	private matchStatusEl: HTMLElement | null = null;
	private player1ScoreEl: HTMLElement | null = null;
	private player2ScoreEl: HTMLElement | null = null;

	// 位置修正のためのプロパティ
	private correctionThreshold: number = 3; // 閾値を下げてより敏感に修正
	private correctionCount: number = 0;
	private lastCorrectionTime: number = 0;
	private correctionCooldown: number = 50; // 50msのクールダウン

	// エラーハンドリング用のプロパティ
	private canvasErrorCount: number = 0;
	private maxCanvasErrors: number = 10; // 最大エラー回数
	private handleKeyDownRef: (e: KeyboardEvent) => void;
	private handleKeyUpRef: (e: KeyboardEvent) => void;
	private matchAPI = new MatchAPI();

	constructor(params?: { [key: string]: string }) {
		if (params) {
			// todo : param が null の時は home に戻す
			this.matchId = params.matchId;
			this.roomId = params.roomId;
		}
		this.handleKeyDownRef = this.handleKeyDown.bind(this);
		this.handleKeyUpRef = this.handleKeyUp.bind(this);
	}

	public async render(): Promise<void> {
		await this.runMatch();
	}

	private async runMatch(): Promise<void> {
		try {
			await this.setupMatchAPI();
			await new Promise((resolve) => setTimeout(resolve, 500));
			this.getMatchStatus();
			await this.waitForMatchData();
			this.serverState = this.matchAPI.getMatchData();
			this.PlayerRole = this.matchAPI.getPlayerRole();
			if (!this.PlayerRole) {
				throw "error"; // こいつが犯人
			}
			await this.setupElement();
			this.setupEventListeners();
			this.updatePlayerInfo(); // プレイヤー情報を更新
			this.prepareMatch();
		} catch (error) {
			// alert("Failed to start match");
			// // todo ここは navigate
			// window.location.pathname = "/" ;
		}
	}

	// matchDataが取得できるまで待機する関数
	private async waitForMatchData(): Promise<void> {
		const maxRetries = 100;
		const retryInterval = 100;

		for (let i = 0; i < maxRetries; i++) {
			const matchData = this.matchAPI.getMatchData();
			if (matchData !== null) {
				return;
			}

			await new Promise((resolve) => setTimeout(resolve, retryInterval));
		}

		throw new Error("Match data not received within 10 seconds");
	}

	// 初期化周り
	private async setupMatchAPI(): Promise<void> {
		if (this.roomId) {
			await this.matchAPI.ensureConnection(this.roomId);
		} else {
			//todo 変更
			throw "no match id";
		}

		if (this.matchId) {
			this.matchAPI.setMatchId(this.matchId);
		}
		this.matchAPI.setCallback(this.handleMatchEvent.bind(this));
	}

	private getMatchStatus(): void {
		this.matchAPI.sendMatchStart();
	}

	private setupEventListeners(): void {
		this.setupReadyButton();
		this.setupKeyboardListeners();
		window.addEventListener("popstate", this.handlePopState.bind(this), {
			once: true,
		});
	}

	private setupElement(): void {
		try {
			// 必須要素の取得とエラーハンドリング
			this.canvas = document.getElementById("matchCanvas") as HTMLCanvasElement;
			if (!this.canvas) {
				throw new Error("Canvas element 'matchCanvas' not found");
			}

			// オプション要素の取得
			this.readyButton = document.getElementById(
				"ready-button",
			) as HTMLButtonElement;
			this.playerRoleEl = document.getElementById("player-role");
			this.matchStatusEl = document.getElementById("match-status");
			this.player1ScoreEl = document.getElementById("player1-score");
			this.player2ScoreEl = document.getElementById("player2-score");
		} catch (error) {
			console.error("Failed to setup DOM elements:", error);
			throw error; // 上位にエラーを伝播
		}
	}

	private prepareMatch(): void {
		// ready button の処理を行う
		// 2名がbuttonを押したら開始、buttonの取り消し操作はできない

		if (!this.serverState || !this.readyButton) {
			return;
		}

		// プレイヤーの役割に応じたボタンの表示制御
		if (this.PlayerRole === "spectator") {
			// 観戦者の場合はreadyボタンを非表示
			this.readyButton.style.display = "none";
			return;
		}

		// UIの更新はincoming messageでのみ行うため、ここでは初期表示のみ
		this.setInitialReadyButtonState();
	}

	private setInitialReadyButtonState(): void {
		if (!this.readyButton || !this.serverState) {
			return;
		}

		// 初期表示のみ設定（incoming messageで更新される）
		if (this.serverState.status === "scheduled") {
			this.readyButton.textContent = "Ready";
			this.readyButton.disabled = false;
			this.readyButton.style.backgroundColor = "#007bff";
		} else if (this.serverState.status === "playing") {
			this.readyButton.textContent = "Playing...";
			this.readyButton.disabled = true;
			this.readyButton.style.backgroundColor = "#6c757d";
		} else if (this.serverState.status === "finished") {
			this.readyButton.textContent = "Match Finished";
			this.readyButton.disabled = true;
			this.readyButton.style.backgroundColor = "#6c757d";
		}

		// 初期状態の表示
		this.setInitialReadyStatusDisplay();
	}

	private setInitialReadyStatusDisplay(): void {
		if (!this.matchStatusEl) {
			return;
		}

		if (this.serverState?.status === "scheduled") {
			this.matchStatusEl.textContent = "Ready: 0/2 players";
		} else if (this.serverState?.status === "playing") {
			this.matchStatusEl.textContent = "Match in progress";
		} else if (this.serverState?.status === "finished") {
			this.matchStatusEl.textContent = "Match finished";
		}
	}

	private updateReadyButtonState(): void {
		if (!this.readyButton || !this.serverState) {
			return;
		}

		const isCurrentUserReady = this.matchAPI.isCurrentUserReady();
		const readyCount = this.matchAPI.getReadyPlayerCount();

		// マッチの状態に応じたボタンの表示
		if (this.serverState.status === "scheduled") {
			if (isCurrentUserReady) {
				this.readyButton.textContent = "Ready!";
				this.readyButton.disabled = true;
				this.readyButton.style.backgroundColor = "#28a745";
			} else {
				this.readyButton.textContent = "Ready";
				this.readyButton.disabled = false;
				this.readyButton.style.backgroundColor = "#007bff";
			}
		} else if (this.serverState.status === "playing") {
			this.readyButton.textContent = "Playing...";
			this.readyButton.disabled = true;
			this.readyButton.style.backgroundColor = "#6c757d";
		} else if (this.serverState.status === "finished") {
			this.readyButton.textContent = "Match Finished";
			this.readyButton.disabled = true;
			this.readyButton.style.backgroundColor = "#6c757d";
		}

		// 準備完了プレイヤー数の表示
		this.updateReadyStatusDisplay(readyCount);
	}

	private updateReadyStatusDisplay(readyCount: number): void {
		if (!this.matchStatusEl) {
			return;
		}

		if (this.serverState?.status === "scheduled") {
			this.matchStatusEl.textContent = `Ready: ${readyCount}/2 players`;
		} else if (this.serverState?.status === "playing") {
			this.matchStatusEl.textContent = "Match in progress";
		} else if (this.serverState?.status === "finished") {
			this.matchStatusEl.textContent = "Match finished";
		}
	}

	private updatePlayerInfo(): void {
		if (!this.playerRoleEl) {
			return;
		}

		if (this.PlayerRole === "player1") {
			this.playerRoleEl.textContent = "Player 1";
		} else if (this.PlayerRole === "player2") {
			this.playerRoleEl.textContent = "Player 2";
		} else if (this.PlayerRole === "spectator") {
			this.playerRoleEl.textContent = "Spectator";
		} else {
			this.playerRoleEl.textContent = "Unknown";
		}
	}

	private startMatchLoop(): void {
		// 既にマッチループが動いている場合は何もしない
		if (this.animationFrameId !== null) {
			return;
		}

		this.matchLoop();
	}

	private stopMatchLoop(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	private matchLoop(): void {
		if (!this.canvas) {
			this.canvasErrorCount++;

			// 最大エラー回数に達した場合はmatch loopを停止
			if (this.canvasErrorCount >= this.maxCanvasErrors) {
				console.error("Too many canvas errors, stopping match loop");
				this.stopMatchLoop();
				return;
			}

			// 短い遅延後に再試行
			setTimeout(() => {
				this.animationFrameId = requestAnimationFrame(
					this.matchLoop.bind(this),
				);
			}, 16); // 約60fps
			return;
		}

		// Canvas要素が正常に取得できた場合はエラーカウントをリセット
		this.canvasErrorCount = 0;

		this.updateMyPaddle(); // send
		this.updateMatchState(); // receive
		this.draw(); // draw

		this.animationFrameId = requestAnimationFrame(this.matchLoop.bind(this));
	}

	private updateMyPaddle(): void {
		// WebSocket接続状態を確認
		if (!this.matchAPI.isConnected()) {
			return;
		}

		let hasMoved = false;

		if (this.movingUp) {
			this.myPredictedPaddleY -= CONSTANTS.PADDLE_SPEED;
			hasMoved = true;
		}
		if (this.movingDown) {
			this.myPredictedPaddleY += CONSTANTS.PADDLE_SPEED;
			hasMoved = true;
		}

		this.myPredictedPaddleY = Math.max(
			CONSTANTS.PADDLE_MIN_Y,
			Math.min(CONSTANTS.PADDLE_MAX_Y, this.myPredictedPaddleY),
		);

		if (hasMoved) {
			this.matchAPI.sendPaddleMove({ y: this.myPredictedPaddleY });
		}
	}

	private updateMatchState(): void {
		const newServerState = this.matchAPI.getMatchData();

		if (newServerState) {
			if (this.serverState && this.PlayerRole) {
				this.checkAndCorrectPosition(newServerState);
			}

			this.serverState = newServerState;
		}
	}

	private checkAndCorrectPosition(serverState: RealtimeMatchStateDto): void {
		const currentTime = Date.now();
		const serverPaddleY =
			this.PlayerRole === "player1"
				? serverState.paddles.player1.y
				: serverState.paddles.player2.y;
		const error = Math.abs(this.myPredictedPaddleY - serverPaddleY);

		// クールダウン時間を短縮（より敏感に補正）
		if (currentTime - this.lastCorrectionTime < this.correctionCooldown) {
			return;
		}

		// 閾値を下げてより敏感に補正
		if (error > this.correctionThreshold) {
			this.correctionCount++;
			this.lastCorrectionTime = currentTime;

			const correctionError = serverPaddleY - this.myPredictedPaddleY;
			// エラーが大きいほど補正速度を上げる
			const correctionSpeed = Math.min(0.5, error / 10);
			this.myPredictedPaddleY += correctionError * correctionSpeed;
		}
	}

	private handleReadyButtonClick(): void {
		if (this.PlayerRole === "spectator" || this.PlayerRole === null) {
			return;
		}

		if (!this.serverState) {
			return;
		}

		if (
			this.serverState &&
			(this.serverState.status === "playing" ||
				this.serverState.status === "finished")
		) {
			return;
		}

		// 既にready状態の場合は何もしない
		if (this.matchAPI.isCurrentUserReady()) {
			return;
		}

		this.matchAPI.sendReady(); //取り消し無効

		// UIの更新はincoming messageでのみ行うため、ここでは何もしない
	}

	private draw(): void {
		if (!this.canvas) {
			return;
		}

		const ctx = this.canvas.getContext("2d");
		if (!ctx) {
			return;
		}

		this.clearCanvas(ctx, this.canvas);

		if (!this.serverState) {
			this.drawConnectionMessage(ctx, this.canvas);
			return;
		}

		this.drawScore();
		this.drawGameElements(ctx, this.canvas);
	}

	public destroy(): void {
		// マッチループを停止
		this.stopMatchLoop();

		// キーボードイベントリスナーを削除
		document.removeEventListener("keydown", this.handleKeyDownRef);
		document.removeEventListener("keyup", this.handleKeyUpRef);

		// MatchAPIのリソースをクリーンアップ
		if (this.matchAPI) {
			this.matchAPI.destroy();
		}

		// 全ての値を初期化
		this.resetAllValues();
	}

	// 全ての値を初期化
	private resetAllValues(): void {
		this.matchId = null;
		this.animationFrameId = null;
		this.serverState = null;
		this.myPredictedPaddleY = CONSTANTS.INITIAL_PADDLE_Y;
		this.correctionCount = 0;
		this.PlayerRole = null;
		this.movingUp = false;
		this.movingDown = false;
		this.canvasErrorCount = 0; // エラーカウントもリセット
	}

	// todo : private から呼び出される関数

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

	private setupReadyButton(): void {
		if (this.readyButton) {
			this.readyButton.addEventListener("click", () =>
				this.handleReadyButtonClick(),
			);
		}
	}

	private setupKeyboardListeners(): void {
		window.addEventListener("keydown", this.handleKeyDownRef);
		window.addEventListener("keyup", this.handleKeyUpRef);
	}

	// draw 各種関数
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

	private drawScore(): void {
		if (!this.serverState) return;

		if (this.player1ScoreEl)
			this.player1ScoreEl.textContent =
				this.serverState.scores.player1.toString();
		if (this.player2ScoreEl)
			this.player2ScoreEl.textContent =
				this.serverState.scores.player2.toString();
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
			this.PlayerRole === "player1" ? this.myPredictedPaddleY : player1.y;
		this.drawPaddle(ctx, CONSTANTS.PADDLE_MARGIN, p1Y);

		// Player 2 paddle
		const p2Y =
			this.PlayerRole === "player2" ? this.myPredictedPaddleY : player2.y;
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

	// handler (delete room など)
	private handleMatchEvent(data: any, action?: string): void {
		if (action === "match_finished") {
			this.stopMatchLoop();
			navigate(`/tournament/${this.roomId}`);
		} else if (action === "room_deleted") {
			this.stopMatchLoop();
			this.handleRoomDeleted(data);
		} else if (action === "force_lobby") {
			this.stopMatchLoop();
			this.handleForceLobby(data);
		} else if (action === "ready_state") {
			// ready状態の変更を処理
			this.updateReadyButtonState();
		} else if (action === "match_state") {
			// マッチ状態の変更を処理
			this.updateReadyButtonState();
			// リロード時にマッチが進行中の場合はマッチループを開始
			if (
				this.serverState?.status === "playing" &&
				this.animationFrameId === null
			) {
				this.startMatchLoop();
			}
		} else if (action === "match_started") {
			// マッチ開始時の処理
			this.updateReadyButtonState();
			this.startMatchLoop();
		}
	}

	private handleRoomDeleted(data: any): void {
		// ルーム削除時の処理
		const message = data?.message || "Room has been deleted.";

		// ユーザーに通知を表示
		this.showRoomDeletedNotification(message);

		// 3秒後にロビーページにナビゲート
		setTimeout(() => {
			navigate("/lobby");
		}, 3000);
	}

	private handleForceLobby(data: any): void {
		// 強制的にlobbyに戻す処理
		const message =
			data?.message ||
			"A user has been disconnected for too long. Returning to lobby.";

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
			if (this.canvas) {
				const ctx = this.canvas.getContext("2d");
				if (ctx) {
					// キャンバスをクリア
					ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
					ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

					// 通知メッセージを表示
					ctx.fillStyle = "#f8d7da";
					ctx.fillRect(50, 200, this.canvas.width - 100, 200);

					ctx.fillStyle = "#721c24";
					ctx.font = "24px Arial";
					ctx.textAlign = "center";
					ctx.fillText("ルームが削除されました", this.canvas.width / 2, 250);
					ctx.fillText(message, this.canvas.width / 2, 280);
					ctx.fillText(
						"3秒後にロビーに戻ります...",
						this.canvas.width / 2,
						320,
					);
				}
			}

			// ボタンを無効化
			if (this.readyButton) {
				this.readyButton.disabled = true;
				this.readyButton.textContent = "Room Deleted";
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
						<h2>接続が切断されました</h2>
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
					padding: 1rem;
					border-radius: 5px;
					text-align: center;
					box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
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

	// 戻るボタンが押されたときの処理
	private handlePopState(): void {
		this.cleanup();
		navigate("/");
	}

	// クリーンアップ
	private cleanup(): void {
		try {
			// WebSocket接続とコールバックをクリーンアップ
			this.matchAPI.removeCallback();
			this.matchAPI.destroy();

			// マッチループを停止
			this.stopMatchLoop();

			// イベントリスナーを削除
			window.removeEventListener("keydown", this.handleKeyDownRef);
			window.removeEventListener("keyup", this.handleKeyUpRef);
		} catch (error) {
			console.error("Cleanup error:", error);
		}
	}
}
