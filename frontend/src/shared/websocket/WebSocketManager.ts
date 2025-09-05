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
			WebSocketManager.instance = new WebSocketManager();
		}
		return WebSocketManager.instance;
	}

	public addCallback(callback: WebSocketMessageCallback): void {
		this.messageCallbacks.add(callback);
	}

	public removeCallback(callback: WebSocketMessageCallback): void {
		this.messageCallbacks.delete(callback);
	}

	private handleMessage(message: WebSocketMessage): void {
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
			this.disconnect();
		}

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.disconnect();
		}

		if (this.isConnecting && this.connectionPromise) {
			return this.connectionPromise;
		}

		this.isConnecting = true;
		const endpoint = `${baseUrl}/socket?room=${roomId}`;

		this.connectionPromise = this.createConnection(endpoint);

		try {
			await this.connectionPromise;
			this.currentRoomId = roomId;
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
				resolve();
			};

			this.ws.onmessage = (event) => {
				try {
					const message: WebSocketMessage = JSON.parse(event.data);
					this.handleMessage(message);
				} catch (error) {
					console.error("メッセージの解析に失敗しました:", error);
				}
			};

			this.ws.onclose = (_event) => {
				this.ws = null;
			};

			this.ws.onerror = (error) => {
				console.error("WebSocketエラー:", error);
				reject(new Error("WebSocket接続エラー"));
			};

			setTimeout(() => {
				if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
					this.ws.close();
					reject(new Error("WebSocket接続タイムアウト"));
				}
			}, 10000);
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
		if (this.ws) {
			this.ws.close(1000, "正常終了");
			this.ws = null;
		}
		this.currentRoomId = null;
	}

	public clearCallbacks(): void {
		this.messageCallbacks.clear();
	}

	public getCallbackCount(): number {
		return this.messageCallbacks.size;
	}

	public hasCallback(callback: WebSocketMessageCallback): boolean {
		return this.messageCallbacks.has(callback);
	}

	public reset(): void {
		this.disconnect();
		this.clearCallbacks();
		this.isConnecting = false;
		this.connectionPromise = null;
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
