// Viteの機能を使って、HTMLファイルを生の文字列としてインポートします
import gameHtml from './game.html?raw';

// --- サーバーから送られてくるデータの型定義 ---
type RealtimeMatchStateDto = {
    status: 'scheduled' | 'playing' | 'finished' | 'canceled';
    ball: { x: number; y: number };
    paddles: {
        player1: { y: number };
        player2: { y: number };
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
    private myPaddleY: number = 300; // 初期位置
    private movingUp: boolean = false;
    private movingDown: boolean = false;

    // キーボードイベントのハンドラをクラスのプロパティとして保持
    private handleKeyDownRef: (e: KeyboardEvent) => void;
    private handleKeyUpRef: (e: KeyboardEvent) => void;

    constructor(params?: { [key: string]: string }) {
        this.app = document.getElementById('app')!;
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
            window.location.pathname = '/'; // ホームにリダイレクト
            return;
        }
        // .
        this.myPaddleY = 300; // レンダリングごとに初期化

        // 他のページに移動した際にリソースをクリーンアップするためのイベントリスナー
        window.addEventListener('popstate', this.cleanup.bind(this), { once: true });

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
        window.removeEventListener('keydown', this.handleKeyDownRef);
        window.removeEventListener('keyup', this.handleKeyUpRef);
    }

    private connectToWebSocket(): void {
         const matchId = this.matchId;
        const token = localStorage.getItem('accessToken');

        if (!token) {
            alert("Token not found. Please login.");
            window.location.pathname = '/auth/login';
            return;
        }

        const url = `wss://localhost:8080/ws/game/${matchId}?token=${token}`;
        this.socket = new WebSocket(url);

        this.socket.onopen = () => console.log("Game WebSocket connection established.");
        this.socket.onclose = () => console.log("Game WebSocket connection closed.");
        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.status === 'Match') {
                this.serverState = message.data;
            }
        };
    }

    // --- イベントリスナーのセットアップとクリーンアップのための修正 ---
    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') this.movingUp = true;
        if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') this.movingDown = true;
    }
    private handleKeyUp(e: KeyboardEvent): void {
        if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') this.movingUp = false;
        if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') this.movingDown = false;
    }

    private setupEventListeners(): void {
        const btnUp = document.getElementById('button-up');
        const btnDown = document.getElementById('button-down');

        if (!btnUp || !btnDown) return;

        // ボタン操作
        btnUp.addEventListener('mousedown', () => this.movingUp = true);
        btnUp.addEventListener('mouseup', () => this.movingUp = false);
        btnUp.addEventListener('mouseleave', () => this.movingUp = false);

        btnDown.addEventListener('mousedown', () => this.movingDown = true);
        btnDown.addEventListener('mouseup', () => this.movingDown = false);
        btnDown.addEventListener('mouseleave', () => this.movingDown = false);
        
        // キーボード操作 (クリーンアップのために参照を保持)
        window.addEventListener('keydown', this.handleKeyDownRef);
        window.addEventListener('keyup', this.handleKeyUpRef);
    }

    private updateMyPaddle(): void {
        const PADDLE_SPEED = 5;
        let hasMoved = false;

        if (this.movingUp) { this.myPaddleY -= PADDLE_SPEED; hasMoved = true; }
        if (this.movingDown) { this.myPaddleY += PADDLE_SPEED; hasMoved = true; }
        
        this.myPaddleY = Math.max(50, Math.min(600 - 50, this.myPaddleY));

        if (hasMoved && this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                status: 'Match', action: 'Move', position: { y: this.myPaddleY }
            }));
        }
    }
    
    private gameLoop(): void {
        this.updateMyPaddle();
        this.draw();
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    private draw(): void {
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!this.serverState) {
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Connecting to server...', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const state = this.serverState;
        const score1El = document.getElementById('player1-score');
        const score2El = document.getElementById('player2-score');
        if (score1El) score1El.textContent = state.scores.player1.toString();
        if (score2El) score2El.textContent = state.scores.player2.toString();

        ctx.fillStyle = 'white';
        ctx.fillRect(10, state.paddles.player1.y - 50, 10, 100);
        ctx.fillRect(canvas.width - 20, state.paddles.player2.y - 50, 10, 100);
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
        ctx.fill();

        if (state.status === 'finished') {
            ctx.font = '50px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
        }
    }
}

export function renderGamePage(params?: { [key: string]: string }): void {
    const page = new GamePage(params);
    page.render();
}