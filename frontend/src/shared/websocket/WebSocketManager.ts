export type WebSocketMessage = {
	status: string;
	action?: string;
	[key: string]: any;
};

export type WebSocketMessageCallback = (message: WebSocketMessage) => void;

export class WebSocketManager {
	private static instance: WebSocketManager;
	private ws: WebSocket | null = null;
	private currentRoomId: string | null = null;
	private isConnecting: boolean = false;
	private connectionPromise: Promise<void> | null = null;
	private messageCallbacks: Set<WebSocketMessageCallback> = new Set();

	private constructor() {}

	public static getInstance(): WebSocketManager {
		if (!WebSocketManager.instance) {
			console.log("WebSocketManager : new instance");
			WebSocketManager.instance = new WebSocketManager();
			return WebSocketManager.instance;
		}
		console.log("WebSocketManager : get instance");
		return WebSocketManager.instance;
	}

	public addCallback(callback: WebSocketMessageCallback): void {
		console.log("WebSocketManager : add callback");
		this.messageCallbacks.add(callback);
	}

	public removeCallback(callback: WebSocketMessageCallback): void {
		console.log("WebSocketManager : remove callback");
		this.messageCallbacks.delete(callback);
	}

	private handleMessage(message: WebSocketMessage): void {
		console.log("WebSocketManager : handle message");
		this.messageCallbacks.forEach((callback) => {
			try {
				callback(message);
			} catch (error) {
				console.error("Message callback error:", error);
			}
		});
	}

	public async connect(roomId: string): Promise<void> {
		const baseUrl = "wss://localhost:8080";

		if (this.currentRoomId && this.currentRoomId !== roomId) {
			console.log(
				`異なるルームに接続しようとしています。現在: ${this.currentRoomId}, 新しい: ${roomId}`,
			);
			this.disconnect();
		}

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			console.log("既存のWebSocket接続を切断します");
			this.disconnect();
		}

		if (this.isConnecting && this.connectionPromise) {
			console.log("既に接続中のため、既存のPromiseを返します");
			return this.connectionPromise;
		}

		this.isConnecting = true;
		const endpoint = `${baseUrl}/socket?room=${roomId}`;

		this.connectionPromise = this.createConnection(endpoint);

		try {
			await this.connectionPromise;
			this.currentRoomId = roomId; // 接続成功時にルームIDを設定
			console.log(`ルーム ${roomId} に接続完了`);
		} finally {
			this.isConnecting = false;
			this.connectionPromise = null;
		}
	}

	private createConnection(endpoint: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const token = localStorage.getItem("accessToken");
			if (!token) {
				console.error("アクセストークンが見つかりません");
				reject(new Error("アクセストークンが見つかりません"));
				return;
			}

			const url = new URL(endpoint);
			url.searchParams.set("token", token);
			const finalUrl = url.toString();
			this.ws = new WebSocket(finalUrl);

			this.ws.onopen = () => {
				console.log("WebSocket接続が確立されました");
				resolve();
			};

			this.ws.onmessage = (event) => {
				try {
					const message: WebSocketMessage = JSON.parse(event.data); // backend にあっているのか
					console.log("WebSocket message received:", message);
					this.handleMessage(message);
				} catch (error) {
					console.error("メッセージの解析に失敗しました:", error);
				}
			};

			this.ws.onclose = (event) => {
				console.log("WebSocket接続が閉じられました:", event.code, event.reason);
				this.ws = null;
			};

			this.ws.onerror = (error) => {
				console.error("WebSocketエラー:", error);
				reject(new Error("WebSocket接続エラー"));
			};

			// タイムアウト設定
			setTimeout(() => {
				if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
					console.error("WebSocket接続タイムアウト");
					this.ws.close();
					reject(new Error("WebSocket接続タイムアウト"));
				}
			}, 10000); // 10秒でタイムアウト
		});
	}

	public sendMessage(message: WebSocketMessage): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			console.error("WebSocketが接続されていません");
		}
	}

	public isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	public disconnect(): void {
		// todo : 適切なものを考える 謎に呼ばれて消されている
		// if (this.ws) {
		// 	console.log("WebSocket接続を切断します");
		// 	this.ws.close(1000, "正常終了");
		// 	this.ws = null;
		// }
		// this.currentRoomId = null; // ルームIDもリセット
		// this.messageCallbacks.clear(); // コールバックもクリア
		// console.log("WebSocket接続とメッセージコールバックをクリアしました");
	}

	public getConnectionState(): string {
		if (!this.ws) return "disconnected";
		switch (this.ws.readyState) {
			case WebSocket.CONNECTING:
				return "connecting";
			case WebSocket.OPEN:
				return "open";
			case WebSocket.CLOSING:
				return "closing";
			case WebSocket.CLOSED:
				return "closed";
			default:
				return "unknown";
		}
	}
}
