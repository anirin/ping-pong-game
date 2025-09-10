import { navigate } from "../../../app/routing/index.js";
import {
	type GuestTournamentData,
	type GuestTournamentMatch,
	TournamentStateManager,
} from "./tournamentState.js";

export function createGuestTournamentController(params?: {
	[key: string]: string;
}) {
	const controller = new GuestTournamentController(params);
	return {
		destroy: () => controller.destroy(),
	};
}

export { GuestTournamentController };

class GuestTournamentController {
	private isDestroyed: boolean = false;
	private players: string[] = [];
	private gameLoopInterval: number | null = null;
	private stateManager: TournamentStateManager;

	constructor(params?: { [key: string]: string }) {
		// 状態管理マネージャーを初期化
		this.stateManager = TournamentStateManager.getInstance();
		const urlParams = new URLSearchParams(window.location.search);
		const isNewTournament = urlParams.has("player1");

		if (isNewTournament) {
			this.stateManager.clearState();
			this.players = [
				urlParams.get("player1") || "Player 1",
				urlParams.get("player2") || "Player 2",
				urlParams.get("player3") || "Player 3",
				urlParams.get("player4") || "Player 4",
			];
		}

		this.initialize();

		const pendingResult = this.stateManager.getPendingMatchResult();
		if (pendingResult) {
			this.processMatchResult(
				pendingResult.matchId,
				pendingResult.winner,
				pendingResult.score1,
				pendingResult.score2,
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
			this.players = existingData.players;
		} else {
			if (this.players.length === 0) {
				this.players = ["Player 1", "Player 2", "Player 3", "Player 4"];
			}

			const tournamentData: GuestTournamentData = {
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
			this.stateManager.setTournamentData(tournamentData);
			this.stateManager.setCurrentMatchIndex(0);
		}

		this.stateManager.logState();

		this.updateTournamentDisplay();
		this.setupEventListeners();

		// トーナメントを自動的に開始
		this.startTournament();
	}

	private setupEventListeners(): void {
		// マッチ開始ボタン
		const goToMatchBtn = document.getElementById("go-to-match-btn");
		if (goToMatchBtn) {
			goToMatchBtn.addEventListener("click", () => {
				this.startNextMatch();
			});
		}
	}

	private startTournament(): void {
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		this.stateManager.updateTournamentStatus("in_progress");
		this.updateTournamentStatus("進行中");

		// 最初のマッチの準備（手動開始）
		this.updateNextMatchInfo();
	}

	private startNextMatch(): void {
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		const currentMatchIndex = this.stateManager.getCurrentMatchIndex();
		const currentMatch = tournamentData.matches[currentMatchIndex];
		if (!currentMatch) return;

		this.stateManager.updateMatchStatus(currentMatch.id, "in_progress");
		this.updateMatchDisplay();

		// グローバル状態に現在のマッチ情報を保存
		this.stateManager.setCurrentMatch(
			currentMatch.id,
			currentMatch.player1,
			currentMatch.player2,
			currentMatch.round,
		);

		// クリーンなURLでマッチページに遷移
		navigate("/match_guest");
	}

	private updateTournamentDisplay(): void {
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		// プレイヤー名を更新
		this.updatePlayerNames();

		// スコアを更新
		this.updateScores();

		// 決勝戦の表示を更新（決勝戦が存在する場合）
		if (tournamentData.currentRound > 1) {
			const finalMatch = tournamentData.matches.find(
				(match) => match.round === 2,
			);
			if (finalMatch) {
				this.updateFinalMatchDisplay(finalMatch);
			}
		}

		// 次のマッチ情報を更新
		this.updateNextMatchInfo();
	}

	private updatePlayerNames(): void {
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		const matches = tournamentData.matches;

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
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		const matches = tournamentData.matches;

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

		// 決勝戦のスコアは updateFinalMatchDisplay で処理
	}

	private updateMatchDisplay(): void {
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		const currentMatchIndex = this.stateManager.getCurrentMatchIndex();
		const currentMatch = tournamentData.matches[currentMatchIndex];
		if (!currentMatch) return;

		// マッチの状態に応じて表示を更新
		if (currentMatch.status === "completed") {
			this.updateScores();
			this.checkTournamentProgress();
		}
	}

	private updateNextMatchInfo(): void {
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		const currentMatchIndex = this.stateManager.getCurrentMatchIndex();

		const nextMatchSection = document.getElementById("next-match-section");
		const nextMatchRound = document.getElementById("next-match-round");
		const nextMatchPlayers = document.getElementById("next-match-players");

		if (currentMatchIndex < tournamentData.matches.length) {
			const currentMatch = tournamentData.matches[currentMatchIndex];

			if (currentMatch && currentMatch.status === "waiting") {
				if (nextMatchSection) nextMatchSection.style.display = "block";
				if (nextMatchRound)
					nextMatchRound.textContent = `ラウンド ${currentMatch.round}`;
				if (nextMatchPlayers)
					nextMatchPlayers.textContent = `${currentMatch.player1} vs ${currentMatch.player2}`;
			} else {
				if (nextMatchSection) nextMatchSection.style.display = "none";
			}
		} else {
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
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		// すべてのマッチが完了したかチェック
		const allMatchesCompleted = tournamentData.matches.every(
			(match) => match.status === "completed",
		);

		if (allMatchesCompleted) {
			if (tournamentData.currentRound === 1) {
				// 決勝戦の準備
				this.prepareFinalMatch();
			} else {
				// トーナメント完了
				this.completeTournament();
			}
		}
	}

	private determineMatchWinner(match: GuestTournamentMatch): string {
		// スコアに基づいて勝者を決定
		if (match.score1 > match.score2) {
			return match.player1;
		} else if (match.score2 > match.score1) {
			return match.player2;
		} else {
			// スコアが同じ場合はplayer1を勝者とする（実際のゲームでは延長戦など）
			return match.player1;
		}
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

		// 決勝戦のスコアを更新
		const finalScore1 = document.getElementById("player-score-final-1");
		const finalScore2 = document.getElementById("player-score-final-2");
		if (finalScore1) finalScore1.textContent = finalMatch.score1.toString();
		if (finalScore2) finalScore2.textContent = finalMatch.score2.toString();
	}

	private completeTournament(): void {
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		// 決勝戦を探す（round: 2のマッチ）
		const finalMatch = tournamentData.matches.find(
			(match) => match.round === 2,
		);
		if (finalMatch) {
			// 決勝戦が既に完了しているかチェック
			if (finalMatch.status === "completed") {
				const winner = finalMatch.winner;
				if (winner) {
					// 状態管理マネージャーでトーナメント完了
					this.stateManager.completeTournament(winner);

					// 表示を更新（決勝戦のスコアを含む）
					this.updateTournamentDisplay();
					this.showWinner(winner);
					this.updateTournamentStatus("完了");

					// 3秒後にlobbyに戻る
					setTimeout(() => {
						this.returnToLobby();
					}, 3000);
				}
			}
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
	private processMatchResult(
		matchId: string,
		winner: string,
		score1: number,
		score2: number,
	): void {
		// 状態管理マネージャーでマッチ結果を更新
		this.stateManager.updateMatchResult(matchId, winner, score1, score2);

		// 状態管理マネージャーから最新の状態を取得
		const updatedData = this.stateManager.getTournamentData();
		if (!updatedData) {
			console.error("トーナメントデータが存在しません");
			return;
		}

		// マッチ結果を確認
		const match = updatedData.matches.find((m) => m.id === matchId);
		if (match) {
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
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		const currentMatchIndex = this.stateManager.getCurrentMatchIndex();

		// 現在のマッチが完了したかチェック
		const currentMatch = tournamentData.matches[currentMatchIndex];

		if (currentMatch && currentMatch.status === "completed") {
			// 状態管理マネージャーを更新
			this.stateManager.advanceToNextMatch();

			// 状態管理マネージャーから最新の状態を取得
			const updatedData = this.stateManager.getTournamentData();
			if (!updatedData) return;

			const newMatchIndex = this.stateManager.getCurrentMatchIndex();

			// すべてのマッチが完了したかチェック
			if (newMatchIndex >= updatedData.matches.length) {
				// 決勝戦が完了したかチェック
				if (updatedData.currentRound === 2) {
					this.completeTournament();
				} else {
					// 決勝戦の準備
					this.prepareFinalMatch();
				}
			} else {
				// 次のマッチの準備
				this.updateNextMatchInfo();
			}
		}
	}

	// 決勝戦の準備
	private prepareFinalMatch(): void {
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		// 準決勝の勝者を決定
		const match1Winner = this.determineMatchWinner(tournamentData.matches[0]);
		const match2Winner = this.determineMatchWinner(tournamentData.matches[1]);

		// 状態管理マネージャーで決勝戦を追加
		this.stateManager.addFinalMatch(match1Winner, match2Winner);

		// 状態管理マネージャーから更新されたデータを取得
		const updatedData = this.stateManager.getTournamentData();
		if (!updatedData) return;

		// 決勝戦の表示を更新
		const finalMatch = updatedData.matches.find((match) => match.round === 2);
		if (finalMatch) {
			this.updateFinalMatchDisplay(finalMatch);
		}
		this.updateNextMatchInfo();
	}

	// 外部からマッチ結果を受け取るメソッド
	public updateMatchResult(
		matchId: string,
		score1: number,
		score2: number,
	): void {
		const tournamentData = this.stateManager.getTournamentData();
		if (!tournamentData) return;

		const match = tournamentData.matches.find((m) => m.id === matchId);
		if (match) {
			const winner = score1 > score2 ? match.player1 : match.player2;
			this.stateManager.updateMatchResult(matchId, winner, score1, score2);
			this.updateMatchDisplay();
		}
	}

	private returnToLobby(): void {
		// 状態管理マネージャーを完全にクリア
		this.stateManager.clearState();

		// lobbyに戻る
		navigate("/lobby_guest");
	}

	public destroy(): void {
		if (this.isDestroyed) return;
		this.isDestroyed = true;

		if (this.gameLoopInterval) {
			clearInterval(this.gameLoopInterval);
			this.gameLoopInterval = null;
		}

		// トーナメントが完了している場合は状態をクリア
		const tournamentData = this.stateManager.getTournamentData();
		if (tournamentData && tournamentData.status === "completed") {
			this.stateManager.clearState();
		}
	}
}
