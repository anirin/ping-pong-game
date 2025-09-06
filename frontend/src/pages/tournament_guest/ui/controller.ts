import { navigate } from "../../../app/routing/index.js";
import { TournamentStateManager, type GuestTournamentData, type GuestTournamentMatch } from "./tournamentState.js";

export function createGuestTournamentController(params?: { [key: string]: string }) {
	const controller = new GuestTournamentController(params);
	return {
		destroy: () => controller.destroy(),
	};
}

export { GuestTournamentController };

class GuestTournamentController {
	private tournamentData: GuestTournamentData | null = null;
	private isDestroyed: boolean = false;
	private players: string[] = [];
	private currentMatchIndex: number = 0;
	private gameLoopInterval: number | null = null;
	private stateManager: TournamentStateManager;

	constructor(params?: { [key: string]: string }) {
		console.log("GuestTournamentController constructor", params);
		
		// 状態管理マネージャーを初期化
		this.stateManager = TournamentStateManager.getInstance();
		
		// 新しいトーナメントの場合のプレイヤー設定
		if (params) {
			this.players = [
				params.player1 || "Player 1",
				params.player2 || "Player 2", 
				params.player3 || "Player 3",
				params.player4 || "Player 4"
			];
		} else {
			// クエリパラメータから取得（新しいトーナメントの場合のみ）
			const urlParams = new URLSearchParams(window.location.search);
			this.players = [
				urlParams.get("player1") || "Player 1",
				urlParams.get("player2") || "Player 2",
				urlParams.get("player3") || "Player 3",
				urlParams.get("player4") || "Player 4"
			];
		}
		
		// まず初期化を実行
		this.initialize();
		
		// グローバル状態から保留中のマッチ結果をチェック
		const pendingResult = this.stateManager.getPendingMatchResult();
		if (pendingResult) {
			console.log("保留中のマッチ結果を処理します:", pendingResult);
			this.processMatchResult(
				pendingResult.matchId,
				pendingResult.winner,
				pendingResult.score1,
				pendingResult.score2
			);
			// 処理後はクリア
			this.stateManager.clearPendingMatchResult();
		}
	}

	private async initialize(): Promise<void> {
		// 状態管理マネージャーから復元するか、新しく作成するか
		const existingData = this.stateManager.getTournamentData();
		
		if (existingData) {
			// 既存の状態を復元
			this.tournamentData = existingData;
			this.currentMatchIndex = this.stateManager.getCurrentMatchIndex();
			this.players = this.tournamentData.players;
			console.log("トーナメント状態を復元しました:", this.tournamentData);
		} else {
			// 新しいトーナメントを作成
			if (this.players.length === 0) {
				this.players = ["Player 1", "Player 2", "Player 3", "Player 4"];
			}
			
			this.tournamentData = {
				id: "guest-tournament-" + Date.now(),
				status: "waiting",
				players: this.players,
				currentRound: 1,
				matches: [
					{
						id: "match-1",
						round: 1,
						player1: this.players[0],
						player2: this.players[1],
						score1: 0,
						score2: 0,
						status: "waiting",
					},
					{
						id: "match-2",
						round: 1,
						player1: this.players[2],
						player2: this.players[3],
						score1: 0,
						score2: 0,
						status: "waiting",
					},
				],
			};
			
			// 状態管理マネージャーに保存
			this.stateManager.setTournamentData(this.tournamentData);
			this.stateManager.setCurrentMatchIndex(this.currentMatchIndex);
		}

		// デバッグ用：状態をログ出力
		this.stateManager.logState();
		
		this.updateTournamentDisplay();
		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		// トーナメント開始ボタン
		const startTournamentBtn = document.getElementById("start-tournament-btn");
		if (startTournamentBtn) {
			startTournamentBtn.addEventListener("click", () => {
				this.startTournament();
				startTournamentBtn.style.display = "none"; // ボタンを非表示
			});
		}

		// マッチ開始ボタン
		const goToMatchBtn = document.getElementById("go-to-match-btn");
		if (goToMatchBtn) {
			goToMatchBtn.addEventListener("click", () => {
				this.startNextMatch();
			});
		}
	}

	private startTournament(): void {
		if (!this.tournamentData) return;

		this.tournamentData.status = "in_progress";
		this.updateTournamentStatus("進行中");
		
		// 最初のマッチの準備（手動開始）
		console.log("トーナメント開始！最初のマッチの準備ができました。");
		this.updateNextMatchInfo();
	}

	private startNextMatch(): void {
		if (!this.tournamentData) return;

		const currentMatch = this.tournamentData.matches[this.currentMatchIndex];
		if (!currentMatch) return;

		currentMatch.status = "in_progress";
		this.updateMatchDisplay();

		// グローバル状態に現在のマッチ情報を保存
		this.stateManager.setCurrentMatch(
			currentMatch.id,
			currentMatch.player1,
			currentMatch.player2,
			currentMatch.round
		);

		// クリーンなURLでマッチページに遷移
		navigate("/match_guest");
	}

	private updateTournamentDisplay(): void {
		if (!this.tournamentData) return;

		// プレイヤー名を更新
		this.updatePlayerNames();
		
		// スコアを更新
		this.updateScores();
		
		// 次のマッチ情報を更新
		this.updateNextMatchInfo();
	}

	private updatePlayerNames(): void {
		if (!this.tournamentData) return;

		const matches = this.tournamentData.matches;
		
		// Round 1 - Match 1
		const name1_1 = document.getElementById("player-name-1-1");
		const name1_2 = document.getElementById("player-name-1-2");
		if (name1_1) name1_1.textContent = matches[0]?.player1 || "未設定";
		if (name1_2) name1_2.textContent = matches[0]?.player2 || "未設定";

		// Round 1 - Match 2
		const name2_1 = document.getElementById("player-name-2-1");
		const name2_2 = document.getElementById("player-name-2-2");
		if (name2_1) name2_1.textContent = matches[1]?.player1 || "未設定";
		if (name2_2) name2_2.textContent = matches[1]?.player2 || "未設定";
	}

	private updateScores(): void {
		if (!this.tournamentData) return;

		const matches = this.tournamentData.matches;
		
		// Round 1 - Match 1 scores
		const score1_1 = document.getElementById("player-score-1-1");
		const score1_2 = document.getElementById("player-score-1-2");
		if (score1_1) score1_1.textContent = matches[0]?.score1.toString() || "0";
		if (score1_2) score1_2.textContent = matches[0]?.score2.toString() || "0";

		// Round 1 - Match 2 scores
		const score2_1 = document.getElementById("player-score-2-1");
		const score2_2 = document.getElementById("player-score-2-2");
		if (score2_1) score2_1.textContent = matches[1]?.score1.toString() || "0";
		if (score2_2) score2_2.textContent = matches[1]?.score2.toString() || "0";

		// Final match scores
		if (this.tournamentData.currentRound > 1) {
			const finalScore1 = document.getElementById("player-score-final-1");
			const finalScore2 = document.getElementById("player-score-final-2");
			if (finalScore1) finalScore1.textContent = "0";
			if (finalScore2) finalScore2.textContent = "0";
		}
	}

	private updateMatchDisplay(): void {
		if (!this.tournamentData) return;

		const currentMatch = this.tournamentData.matches[this.currentMatchIndex];
		if (!currentMatch) return;

		// マッチの状態に応じて表示を更新
		if (currentMatch.status === "completed") {
			this.updateScores();
			this.checkTournamentProgress();
		}
	}

	private updateNextMatchInfo(): void {
		if (!this.tournamentData) return;

		console.log("updateNextMatchInfo開始 - 現在のマッチインデックス:", this.currentMatchIndex);
		console.log("マッチ数:", this.tournamentData.matches.length);

		const nextMatchSection = document.getElementById("next-match-section");
		const nextMatchRound = document.getElementById("next-match-round");
		const nextMatchPlayers = document.getElementById("next-match-players");

		if (this.currentMatchIndex < this.tournamentData.matches.length) {
			const currentMatch = this.tournamentData.matches[this.currentMatchIndex];
			console.log("現在のマッチ:", currentMatch);
			
			if (currentMatch && currentMatch.status === "waiting") {
				console.log("次のマッチを表示します:", `${currentMatch.player1} vs ${currentMatch.player2}`);
				if (nextMatchSection) nextMatchSection.style.display = "block";
				if (nextMatchRound) nextMatchRound.textContent = `ラウンド ${currentMatch.round}`;
				if (nextMatchPlayers) nextMatchPlayers.textContent = `${currentMatch.player1} vs ${currentMatch.player2}`;
			} else {
				console.log("マッチの状態がwaitingではありません:", currentMatch?.status);
				if (nextMatchSection) nextMatchSection.style.display = "none";
			}
		} else {
			console.log("すべてのマッチが完了しました");
			if (nextMatchSection) nextMatchSection.style.display = "none";
		}
	}

	private updateTournamentStatus(status: string): void {
		const statusElement = document.getElementById("tournament-status");
		if (statusElement) {
			statusElement.textContent = status;
		}
	}

	private checkTournamentProgress(): void {
		if (!this.tournamentData) return;

		// すべてのマッチが完了したかチェック
		const allMatchesCompleted = this.tournamentData.matches.every(
			(match) => match.status === "completed"
		);

		if (allMatchesCompleted) {
			if (this.tournamentData.currentRound === 1) {
				// 決勝戦の準備
				this.prepareFinalMatch();
			} else {
				// トーナメント完了
				this.completeTournament();
			}
		}
	}

	private determineMatchWinner(match: GuestTournamentMatch): string {
		// ランダムに勝者を決定（実際のゲームではスコアに基づく）
		return Math.random() > 0.5 ? match.player1 : match.player2;
	}

	private updateFinalMatchDisplay(finalMatch: GuestTournamentMatch): void {
		// Round 2 section を表示
		const round2Section = document.getElementById("round-2-section");
		if (round2Section) round2Section.style.display = "block";

		// 決勝戦のプレイヤー名を更新
		const finalName1 = document.getElementById("player-name-final-1");
		const finalName2 = document.getElementById("player-name-final-2");
		if (finalName1) finalName1.textContent = finalMatch.player1;
		if (finalName2) finalName2.textContent = finalMatch.player2;
	}

	private completeTournament(): void {
		if (!this.tournamentData) return;

		const finalMatch = this.tournamentData.matches[2]; // 決勝戦
		if (finalMatch) {
			const winner = this.determineMatchWinner(finalMatch);
			this.tournamentData.winner = winner;
			this.tournamentData.status = "completed";

			// 状態管理マネージャーでトーナメント完了
			this.stateManager.completeTournament(winner);

			this.showWinner(winner);
			this.updateTournamentStatus("完了");
		}
	}

	private showWinner(winner: string): void {
		const winnerSection = document.getElementById("winner-section");
		const winnerName = document.getElementById("winner-name");
		const nextMatchSection = document.getElementById("next-match-section");

		if (winnerSection) winnerSection.style.display = "block";
		if (winnerName) winnerName.textContent = winner;
		if (nextMatchSection) nextMatchSection.style.display = "none";
	}

	// マッチ結果を処理するメソッド
	private processMatchResult(matchId: string, winner: string, score1: number, score2: number): void {
		console.log("processMatchResult開始:", { matchId, winner, score1, score2 });
		
		// 状態管理マネージャーでマッチ結果を更新
		this.stateManager.updateMatchResult(matchId, winner, score1, score2);
		
		// 状態管理マネージャーから最新の状態を取得
		const updatedData = this.stateManager.getTournamentData();
		if (updatedData) {
			this.tournamentData = updatedData;
			this.currentMatchIndex = this.stateManager.getCurrentMatchIndex();
			console.log("状態を更新:", this.tournamentData);
		}

		if (!this.tournamentData) {
			console.error("トーナメントデータが存在しません");
			return;
		}

		// マッチ結果を確認
		const match = this.tournamentData.matches.find((m) => m.id === matchId);
		if (match) {
			console.log(`マッチ結果: ${match.player1} vs ${match.player2} - 勝者: ${winner} (${score1}-${score2})`);
			
			// 表示を更新
			this.updateTournamentDisplay();
			
			// 次のマッチの準備（手動開始）
			this.prepareNextMatch();
		} else {
			console.error("マッチが見つかりません:", matchId);
		}
	}

	// 次のマッチの準備
	private prepareNextMatch(): void {
		if (!this.tournamentData) return;

		console.log("prepareNextMatch開始 - 現在のマッチインデックス:", this.currentMatchIndex);
		console.log("トーナメントデータ:", this.tournamentData);

		// 現在のマッチが完了したかチェック
		const currentMatch = this.tournamentData.matches[this.currentMatchIndex];
		console.log("現在のマッチ:", currentMatch);
		
		if (currentMatch && currentMatch.status === "completed") {
			console.log("マッチが完了しています。次のマッチに進みます。");
			
			// 次のマッチに進む
			this.currentMatchIndex++;
			
			// 状態管理マネージャーを更新
			this.stateManager.advanceToNextMatch();
			
			console.log("次のマッチインデックス:", this.currentMatchIndex);
			console.log("マッチ数:", this.tournamentData.matches.length);
			
			// すべてのマッチが完了したかチェック
			if (this.currentMatchIndex >= this.tournamentData.matches.length) {
				console.log("決勝戦の準備を開始します");
				// 決勝戦の準備
				this.prepareFinalMatch();
			} else {
				console.log("次のマッチの準備を開始します");
				// 次のマッチの準備
				this.updateNextMatchInfo();
			}
		} else {
			console.log("マッチがまだ完了していません。現在のマッチを継続します。");
		}
	}

	// 決勝戦の準備
	private prepareFinalMatch(): void {
		if (!this.tournamentData) return;

		// 準決勝の勝者を決定
		const match1Winner = this.determineMatchWinner(this.tournamentData.matches[0]);
		const match2Winner = this.determineMatchWinner(this.tournamentData.matches[1]);

		// 状態管理マネージャーで決勝戦を追加
		this.stateManager.addFinalMatch(match1Winner, match2Winner);
		
		// ローカルの状態も更新
		const finalMatch: GuestTournamentMatch = {
			id: "final-match",
			round: 2,
			player1: match1Winner,
			player2: match2Winner,
			score1: 0,
			score2: 0,
			status: "waiting",
		};

		this.tournamentData.matches.push(finalMatch);
		this.tournamentData.currentRound = 2;
		this.currentMatchIndex = 2; // 決勝戦のインデックス

		// 決勝戦の表示を更新
		this.updateFinalMatchDisplay(finalMatch);
		this.updateNextMatchInfo();
	}

	// 外部からマッチ結果を受け取るメソッド
	public updateMatchResult(matchId: string, score1: number, score2: number): void {
		if (!this.tournamentData) return;

		const match = this.tournamentData.matches.find((m) => m.id === matchId);
		if (match) {
			match.score1 = score1;
			match.score2 = score2;
			match.status = "completed";
			match.winner = score1 > score2 ? match.player1 : match.player2;

			this.updateMatchDisplay();
		}
	}

	public destroy(): void {
		if (this.isDestroyed) return;
		this.isDestroyed = true;

		if (this.gameLoopInterval) {
			clearInterval(this.gameLoopInterval);
			this.gameLoopInterval = null;
		}

		// トーナメントが完了している場合は状態をクリア
		if (this.tournamentData && this.tournamentData.status === "completed") {
			this.stateManager.clearState();
			console.log("トーナメント完了 - 状態をクリアしました");
		}

		console.log("GuestTournamentController destroyed");
	}
}
