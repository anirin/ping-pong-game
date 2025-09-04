export type WebSocketMessage = {
	status: string;
	action?: string;
	[key: string]: any;
};

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export class WebSocketManager {
	private static instance: WebSocketManager;
	private ws: WebSocket | null = null;
	private currentRoomId: string | null = null; // 現在接続中のルームID
	private isConnecting: boolean = false;
	private connectionPromise: Promise<void> | null = null;
	private messageHandlers: Map<string, WebSocketEventHandler[]> = new Map();

	private constructor() {}

	public static getInstance(): WebSocketManager {
		if (!WebSocketManager.instance) {
			WebSocketManager.instance = new WebSocketManager();
		}
		return WebSocketManager.instance;
	}

	public async connect(roomId: string): Promise<void> {
		console.log(`WebSocketManager.connect() 開始: ${roomId}`);
		const baseUrl = "wss://localhost:8080";
		
		// 異なるルームに接続しようとしている場合は切断
		if (this.currentRoomId && this.currentRoomId !== roomId) {
			console.log(`異なるルームに接続しようとしています。現在: ${this.currentRoomId}, 新しい: ${roomId}`);
			this.disconnect();
		}
		
		// 既存の接続がある場合は切断
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
		console.log(`接続エンドポイント: ${endpoint}`);
		
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
			console.log("createConnection開始");
			const token = localStorage.getItem("accessToken");
			if (!token) {
				console.error("アクセストークンが見つかりません");
				reject(new Error("アクセストークンが見つかりません"));
				return;
			}

			const url = new URL(endpoint);
			url.searchParams.set("token", token);
			const finalUrl = url.toString();
			console.log(`最終接続URL: ${finalUrl}`);
			this.ws = new WebSocket(finalUrl);
			console.log("WebSocketインスタンス作成完了");

			this.ws.onopen = () => {
				console.log("WebSocket接続が確立されました");
				resolve();
			};

			this.ws.onmessage = (event) => {
				try {
					const message: WebSocketMessage = JSON.parse(event.data);
					console.log("WebSocket raw message received:", event.data);
					console.log("WebSocket parsed message:", message);
					
					this.executeMessageHandlers(message);
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

	/**
	 * メッセージの種類に応じて適切なハンドラーを実行
	 */
	private executeMessageHandlers(message: WebSocketMessage): void {
		// 特定のstatusに対するハンドラーを実行
		if (message.status && this.messageHandlers.has(message.status)) {
			const handlers = this.messageHandlers.get(message.status)!;
			handlers.forEach(handler => {
				try {
					handler(message);
				} catch (error) {
					console.error(`Message handler error for ${message.status}:`, error);
				}
			});
		}

		// グローバルハンドラー（status: "*"）を実行
		if (this.messageHandlers.has("*")) {
			const globalHandlers = this.messageHandlers.get("*")!;
			globalHandlers.forEach(handler => {
				try {
					handler(message);
				} catch (error) {
					console.error("Global message handler error:", error);
				}
			});
		}
	}

	/**
	 * 特定のメッセージタイプに対するハンドラーを追加
	 * @param messageType メッセージの種類（例: "Room", "Tournament", "Match"）
	 * @param handler メッセージハンドラー関数
	 */
	public addMessageHandler(messageType: string, handler: WebSocketEventHandler): void {
		if (!this.messageHandlers.has(messageType)) {
			this.messageHandlers.set(messageType, []);
		}
		this.messageHandlers.get(messageType)!.push(handler);
	}

	/**
	 * 特定のメッセージタイプに対するハンドラーを削除
	 * @param messageType メッセージの種類
	 * @param handler 削除するハンドラー関数
	 */
	public removeMessageHandler(messageType: string, handler: WebSocketEventHandler): void {
		if (this.messageHandlers.has(messageType)) {
			const handlers = this.messageHandlers.get(messageType)!;
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
			if (handlers.length === 0) {
				this.messageHandlers.delete(messageType);
			}
		}
	}

	/**
	 * グローバルメッセージハンドラーを追加（すべてのメッセージを受信）
	 * @param handler メッセージハンドラー関数
	 */
	public addGlobalMessageHandler(handler: WebSocketEventHandler): void {
		this.addMessageHandler("*", handler);
	}

	/**
	 * グローバルメッセージハンドラーを削除
	 * @param handler 削除するハンドラー関数
	 */
	public removeGlobalMessageHandler(handler: WebSocketEventHandler): void {
		this.removeMessageHandler("*", handler);
	}

	/**
	 * 後方互換性のためのメソッド（非推奨）
	 * @deprecated 代わりに addMessageHandler または addGlobalMessageHandler を使用してください
	 */
	public setMessageHandler(handler: WebSocketEventHandler): void {
		console.warn("setMessageHandler is deprecated. Use addGlobalMessageHandler instead.");
		this.addGlobalMessageHandler(handler);
	}

	/**
	 * 後方互換性のためのメソッド（非推奨）
	 * @deprecated 代わりに removeGlobalMessageHandler を使用してください
	 */
	public removeAllMessageHandlers(): void {
		console.warn("removeAllMessageHandlers is deprecated. Use removeGlobalMessageHandler instead.");
		this.messageHandlers.clear();
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
			console.log("WebSocket接続を切断します");
			this.ws.close(1000, "正常終了");
			this.ws = null;
		}
		this.currentRoomId = null; // ルームIDもリセット
		this.messageHandlers.clear();
		console.log("WebSocket接続とメッセージハンドラーをクリアしました");
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
