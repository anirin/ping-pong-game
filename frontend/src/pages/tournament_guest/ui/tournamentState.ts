interface GuestTournamentData {
	id: string;
	status: "waiting" | "in_progress" | "completed";
	players: string[];
	currentRound: number;
	matches: GuestTournamentMatch[];
	winner?: string;
}

interface GuestTournamentMatch {
	id: string;
	round: number;
	player1: string;
	player2: string;
	score1: number;
	score2: number;
	status: "waiting" | "in_progress" | "completed";
	winner?: string;
}

interface TournamentState {
	data: GuestTournamentData | null;
	currentMatchIndex: number;
	currentMatch: {
		matchId: string;
		player1: string;
		player2: string;
		round: number;
	} | null;
	pendingMatchResult: {
		matchId: string;
		winner: string;
		score1: number;
		score2: number;
	} | null;
}

class TournamentStateManager {
	private static instance: TournamentStateManager;
	private state: TournamentState = {
		data: null,
		currentMatchIndex: 0,
		currentMatch: null,
		pendingMatchResult: null
	};

	private constructor() {}

	public static getInstance(): TournamentStateManager {
		if (!TournamentStateManager.instance) {
			TournamentStateManager.instance = new TournamentStateManager();
		}
		return TournamentStateManager.instance;
	}

	// トーナメントデータを設定
	public setTournamentData(data: GuestTournamentData): void {
		this.state.data = data;
		console.log("トーナメントデータを設定:", data);
	}

	// トーナメントデータを取得
	public getTournamentData(): GuestTournamentData | null {
		return this.state.data;
	}

	// 現在のマッチインデックスを設定
	public setCurrentMatchIndex(index: number): void {
		this.state.currentMatchIndex = index;
		console.log("マッチインデックスを設定:", index);
	}

	// 現在のマッチインデックスを取得
	public getCurrentMatchIndex(): number {
		return this.state.currentMatchIndex;
	}

	// マッチ結果を更新
	public updateMatchResult(matchId: string, winner: string, score1: number, score2: number): void {
		if (!this.state.data) {
			console.error("トーナメントデータが存在しません");
			return;
		}

		const match = this.state.data.matches.find((m) => m.id === matchId);
		if (match) {
			match.score1 = score1;
			match.score2 = score2;
			match.status = "completed";
			match.winner = winner;
			console.log(`マッチ結果を更新: ${match.player1} vs ${match.player2} - 勝者: ${winner} (${score1}-${score2})`);
		}
	}

	// 次のマッチに進む
	public advanceToNextMatch(): void {
		if (!this.state.data) {
			console.error("トーナメントデータが存在しません");
			return;
		}

		this.state.currentMatchIndex++;
		console.log("次のマッチに進む:", this.state.currentMatchIndex);
	}

	// 決勝戦を追加
	public addFinalMatch(player1: string, player2: string): void {
		if (!this.state.data) {
			console.error("トーナメントデータが存在しません");
			return;
		}

		// 既に決勝戦が存在するかチェック
		const existingFinalMatch = this.state.data.matches.find(match => match.round === 2);
		if (existingFinalMatch) {
			console.log("決勝戦は既に存在します:", existingFinalMatch);
			return;
		}

		const finalMatch: GuestTournamentMatch = {
			id: "final-match",
			round: 2,
			player1: player1,
			player2: player2,
			score1: 0,
			score2: 0,
			status: "waiting",
		};

		this.state.data.matches.push(finalMatch);
		this.state.data.currentRound = 2;
		// 決勝戦のインデックスは配列の最後の要素
		this.state.currentMatchIndex = this.state.data.matches.length - 1;
		console.log("決勝戦を追加:", finalMatch);
		console.log("決勝戦のインデックス:", this.state.currentMatchIndex);
		console.log("現在のマッチ数:", this.state.data.matches.length);
	}

	// トーナメントを完了
	public completeTournament(winner: string): void {
		if (!this.state.data) {
			console.error("トーナメントデータが存在しません");
			return;
		}

		this.state.data.winner = winner;
		this.state.data.status = "completed";
		console.log("トーナメント完了:", winner);
	}

	// 現在のマッチを設定（マッチ開始時に呼び出し）
	public setCurrentMatch(matchId: string, player1: string, player2: string, round: number): void {
		this.state.currentMatch = {
			matchId,
			player1,
			player2,
			round
		};
		console.log("現在のマッチを設定:", this.state.currentMatch);
	}

	// 現在のマッチを取得
	public getCurrentMatch(): { matchId: string; player1: string; player2: string; round: number; } | null {
		return this.state.currentMatch;
	}

	// 現在のマッチをクリア
	public clearCurrentMatch(): void {
		this.state.currentMatch = null;
		console.log("現在のマッチをクリアしました");
	}

	// マッチ結果を保存（マッチ完了時に呼び出し）
	public setPendingMatchResult(matchId: string, winner: string, score1: number, score2: number): void {
		this.state.pendingMatchResult = {
			matchId,
			winner,
			score1,
			score2
		};
		console.log("マッチ結果を保存:", this.state.pendingMatchResult);
	}

	// 保留中のマッチ結果を取得
	public getPendingMatchResult(): { matchId: string; winner: string; score1: number; score2: number; } | null {
		return this.state.pendingMatchResult;
	}

	// 保留中のマッチ結果をクリア
	public clearPendingMatchResult(): void {
		this.state.pendingMatchResult = null;
		console.log("保留中のマッチ結果をクリアしました");
	}

	// 状態をクリア
	public clearState(): void {
		this.state = {
			data: null,
			currentMatchIndex: 0,
			currentMatch: null,
			pendingMatchResult: null
		};
		console.log("トーナメント状態をクリア");
	}

	// 現在の状態を取得
	public getState(): TournamentState {
		return { ...this.state };
	}

	// デバッグ用：状態をログ出力
	public logState(): void {
		console.log("=== トーナメント状態 ===");
		console.log("データ:", this.state.data);
		console.log("現在のマッチインデックス:", this.state.currentMatchIndex);
		console.log("========================");
	}
}

export { TournamentStateManager, type GuestTournamentData, type GuestTournamentMatch };
