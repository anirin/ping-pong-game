export type WebSocketMessage = {
	status: string;
	action?: string;
	[key: string]: any;
};

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export class WebSocketManager {
	private static instance: WebSocketManager;
	private ws: WebSocket | null = null;
	private isConnecting: boolean = false;
	private connectionPromise: Promise<void> | null = null;
	private messageHandler: WebSocketEventHandler | null = null;

	private constructor() {}

	public static getInstance(): WebSocketManager {
		if (!WebSocketManager.instance) {
			WebSocketManager.instance = new WebSocketManager();
		}
		return WebSocketManager.instance;
	}

	public async connect(roomId: string): Promise<void> {
		const baseUrl = "wss://localhost:8080";
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			return Promise.resolve();
		}

		if (this.isConnecting && this.connectionPromise) {
			return this.connectionPromise;
		}

		this.isConnecting = true;
		const endpoint = `${baseUrl}/socket?room=${roomId}`;
		this.connectionPromise = this.createConnection(endpoint);
		
		try {
			await this.connectionPromise;
		} finally {
			this.isConnecting = false;
			this.connectionPromise = null;
		}
	}

	private createConnection(endpoint: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const token = localStorage.getItem("accessToken");
			if (!token) {
				reject(new Error("アクセストークンが見つかりません"));
				return;
			}

			const url = new URL(endpoint);
			url.searchParams.set("token", token);
			this.ws = new WebSocket(url.toString());

			// todo : 本番では time out の実装が必要　

			this.ws.onopen = () => {
				console.log("WebSocket接続が確立されました");
				resolve();
			};

			this.ws.onmessage = (event) => {
				try {
					const message: WebSocketMessage = JSON.parse(event.data);
					console.log("WebSocket raw message received:", event.data);
					console.log("WebSocket parsed message:", message);
					
					// メッセージハンドラーが設定されている場合は実行
					if (this.messageHandler) {
						this.messageHandler(message);
					}
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
		});
	}

	public setMessageHandler(handler: WebSocketEventHandler): void {
		this.messageHandler = handler;
	}

	public removeMessageHandler(): void {
		this.messageHandler = null;
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
		this.messageHandler = null;
	}

	public getConnectionState(): string {
		if (!this.ws) return "disconnected";
		switch (this.ws.readyState) {
			case WebSocket.CONNECTING: return "connecting";
			case WebSocket.OPEN: return "open";
			case WebSocket.CLOSING: return "closing";
			case WebSocket.CLOSED: return "closed";
			default: return "unknown";
		}
	}
}
