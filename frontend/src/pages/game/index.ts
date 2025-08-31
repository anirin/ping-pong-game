import gameHtml from "./game.html?raw";

type PaddleStateDto = {
	id: string;
	y: number;
};

type RealtimeMatchStateDto = {
	status: "scheduled" | "playing" | "finished" | "canceled";
	ball: { x: number; y: number };
	paddles: {
		player1: PaddleStateDto;
		player2: PaddleStateDto;
	};
	scores: {
		player1: number;
		player2: number;
	};
};

class GamePage {
	private app: HTMLElement;
	private matchId: string | null = null;
	private socket: WebSocket | null = null;
	private animationFrameId: number | null = null;

	// ゲームの状態とUI要素
	private serverState: RealtimeMatchStateDto | null = null;
	private myPredictedPaddleY: number = 300;
	private myPlayerNumber: "player1" | "player2" | null = null;
	private myUserId: string | null = null;
	private movingUp: boolean = false;
	private movingDown: boolean = false;

	// キーボードイベントのハンドラをクラスのプロパティとして保持
	private handleKeyDownRef: (e: KeyboardEvent) => void;
	private handleKeyUpRef: (e: KeyboardEvent) => void;

	constructor(params?: { [key: string]: string }) {
		this.app = document.getElementById("app")!;
		if (params && params.matchId) {
			this.matchId = params.matchId;
		}
		this.handleKeyDownRef = this.handleKeyDown.bind(this);
		this.handleKeyUpRef = this.handleKeyUp.bind(this);
	}

	public render(): void {
		this.app.innerHTML = gameHtml;
		this.runGame();
	}

	private runGame(): void {
		if (!this.matchId) {
			alert("Match ID is missing. Cannot start game.");
			window.location.pathname = "/"; // ホームにリダイレクト
			return;
		}
		// .
		this.myPredictedPaddleY = 300; // レンダリングごとに初期化

		// 他のページに移動した際にリソースをクリーンアップするためのイベントリスナー
		window.addEventListener("popstate", this.cleanup.bind(this), {
			once: true,
		});

		this.connectToWebSocket();
		this.setupEventListeners();
		this.gameLoop();
	}

	private cleanup(): void {
		console.log("Cleaning up game resources...");
		if (this.socket) {
			this.socket.close();
			this.socket = null;
		}
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		window.removeEventListener("keydown", this.handleKeyDownRef);
		window.removeEventListener("keyup", this.handleKeyUpRef);
	}

	private connectToWebSocket(): void {
		const matchId = this.matchId;
		const token = localStorage.getItem("accessToken");

		if (!token) {
			alert("Token not found. Please login.");
			window.location.pathname = "/auth/login";
			return;
		}
		try {
			const payload = JSON.parse(atob(token.split(".")[1]));
			this.myUserId = payload.id;
		} catch (e) {
			console.error("Failed to decode JWT:", e);
			alert("Invalid token.");
			window.location.pathname = "/auth/login";
			return;
		}

		const url = `wss://localhost:8080/ws/game/${matchId}?token=${token}`;
		this.socket = new WebSocket(url);

		this.socket.onopen = () =>
			console.log("Game WebSocket connection established.");
		this.socket.onclose = () =>
			console.log("Game WebSocket connection closed.");
		this.socket.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.status === "Match") {
				this.serverState = message.data;
				if (this.serverState && this.myPlayerNumber === null) {
					if (this.myUserId === this.serverState.paddles.player1.id) {
						this.myPlayerNumber = "player1";

						// 自分のユーザーIDと、サーバーからのプレイヤー2のIDを比較
					} else if (this.myUserId === this.serverState.paddles.player2.id) {
						this.myPlayerNumber = "player2";
					} else {
						// どちらでもない場合は観戦者
						this.myPlayerNumber = null;
					}

					console.log(
						`You are assigned as ${this.myPlayerNumber || "spectator"}`,
					);
				} else {
					console.error("Player IDs are missing in the data from the server.");
				}
			}
		};
	}

	// --- イベントリスナーのセットアップとクリーンアップのための修正 ---
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

		// キーボード操作 (クリーンアップのために参照を保持)
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

		if (hasMoved && this.socket?.readyState === WebSocket.OPEN) {
			this.socket.send(
				JSON.stringify({
					status: "Match",
					action: "Move",
					position: { y: this.myPredictedPaddleY },
				}),
			);
		}
	}

	private gameLoop(): void {
		this.updateMyPaddle();
		this.draw();
		this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
	}

	private draw(): void {
		const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
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
		if (this.myPlayerNumber === "player1") {
			// もし自分がプレイヤー1なら、サーバーの応答を待たずに自分の予測位置で描画する
			ctx.fillRect(10, this.myPredictedPaddleY - 50, 10, 100);
		} else {
			// 自分以外（相手プレイヤー）のパドルは、サーバーからの真実の位置で描画する
			ctx.fillRect(10, serverP1Y - 50, 10, 100);
		}

		// プレイヤー2のパドルを描画
		if (this.myPlayerNumber === "player2") {
			// もし自分がプレイヤー2なら、自分の予測位置で描画する
			ctx.fillRect(canvas.width - 20, this.myPredictedPaddleY - 50, 10, 100);
		} else {
			// 自分以外（相手プレイヤー）のパドルは、サーバーからの真実の位置で描画する
			ctx.fillRect(canvas.width - 20, serverP2Y - 50, 10, 100);
		}
		ctx.beginPath();
		ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
		ctx.fill();

		if (state.status === "finished") {
			ctx.font = "50px Arial";
			ctx.textAlign = "center";
			ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2);
		}
	}
}

export function renderGamePage(params?: { [key: string]: string }): void {
	const page = new GamePage(params);
	page.render();
}
