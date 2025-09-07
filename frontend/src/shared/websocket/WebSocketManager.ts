const VITE_URL = import.meta.env.VITE_URL;


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
	private messageCallback: WebSocketMessageCallback | null = null;

	private constructor() {}

	// getter
	public static getInstance(): WebSocketManager {
		if (!WebSocketManager.instance) {
			WebSocketManager.instance = new WebSocketManager();
		}
		return WebSocketManager.instance;
	}

	public isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
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

	public getCurrentRoomId(): string | null {
		return this.currentRoomId;
	}

	// setter
	public setCallback(callback: WebSocketMessageCallback): void {
		this.messageCallback = callback;
	}

	// remover
	public removeCallback(): void {
		this.messageCallback = null;
	}

	// 各種 method
	public sendMessage(message: WebSocketMessage): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			console.error("WebSocketが接続されていません");
		}
	}

	public async connect(roomId: string): Promise<void> {
		// 既に同じルームに接続済みの場合は何もしない
		if (this.isConnected() && this.currentRoomId === roomId) {
			console.log(`Already connected to room ${roomId}`);
			return;
		}

		// 既存の接続をチェックし、必要に応じて切断
		this.handleExistingConnection(roomId);

		// 既に接続中の場合は待機
		if (this.isConnecting && this.connectionPromise) {
			return this.connectionPromise;
		}

		// 新しい接続を開始
		this.isConnecting = true;
		const endpoint = this.buildWebSocketEndpoint(roomId);
		this.connectionPromise = this.createConnection(endpoint);

		try {
			await this.connectionPromise;
			this.currentRoomId = roomId;
		} finally {
			this.isConnecting = false;
			this.connectionPromise = null;
		}
	}

	public disconnect(): void {
		if (this.ws) {
			this.ws.close(1000, "正常終了");
			this.ws = null;
		}
		this.currentRoomId = null;
	}

	public clearWsManager(): void {
		this.disconnect();
		this.removeCallback();
		this.isConnecting = false;
		this.connectionPromise = null;
	}

	// ------------------------------------------------------------
	// private method
	// ------------------------------------------------------------

	// 接続前の状態チェック
	private handleExistingConnection(roomId: string): void {
		// 異なるルームに接続している場合は切断
		if (this.currentRoomId && this.currentRoomId !== roomId) {
			console.log(
				`Disconnecting from room ${this.currentRoomId} to connect to ${roomId}`,
			);
			this.disconnect();
		}

		// 既存のWebSocket接続がある場合は切断
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			console.log("Closing existing WebSocket connection");
			this.disconnect();
		}
	}

	// WebSocketエンドポイントの構築
	private buildWebSocketEndpoint(roomId: string): string {
		const baseUrl = `wss://${VITE_URL}`;
		return `${baseUrl}/socket?room=${roomId}`;
	}

	// アクセストークンの取得
	private getAccessToken(): string | null {
		const token = localStorage.getItem("accessToken");
		if (!token) {
			console.error("アクセストークンが見つかりません");
		}
		return token;
	}

	// WebSocket URLの構築
	private buildWebSocketUrl(endpoint: string, token: string): string {
		const url = new URL(endpoint);
		url.searchParams.set("token", token);
		return url.toString();
	}

	// WebSocketイベントハンドラーの設定
	private setupWebSocketEventHandlers(
		resolve: () => void,
		reject: (error: Error) => void,
	): void {
		if (!this.ws) return;

		this.ws.onopen = () => {
			resolve();
		};

		this.ws.onmessage = (event) => {
			// debug
			console.log("WebSocketメッセージ:", event.data);
			this.handleWebSocketMessage(event);
		};

		this.ws.onclose = (_event) => {
			this.ws = null;
		};

		this.ws.onerror = (error) => {
			console.error("WebSocketエラー:", error);
			reject(new Error("WebSocket接続エラー"));
		};
	}

	// WebSocketメッセージの処理
	private handleWebSocketMessage(event: MessageEvent): void {
		try {
			const message: WebSocketMessage = JSON.parse(event.data);
			if (this.messageCallback) {
				this.messageCallback(message);
			}
		} catch (error) {
			console.error("メッセージの解析に失敗しました:", error);
		}
	}

	// 接続タイムアウトの設定
	private setupConnectionTimeout(reject: (error: Error) => void): void {
		setTimeout(() => {
			if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
				this.ws.close();
				reject(new Error("WebSocket接続タイムアウト"));
			}
		}, 10000);
	}

	private createConnection(endpoint: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const token = this.getAccessToken();
			if (!token) {
				reject(new Error("アクセストークンが見つかりません"));
				return;
			}

			const finalUrl = this.buildWebSocketUrl(endpoint, token);
			this.ws = new WebSocket(finalUrl);

			this.setupWebSocketEventHandlers(resolve, reject);
			this.setupConnectionTimeout(reject);
		});
	}
}
