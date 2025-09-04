import { tournamentAPI, type TournamentData, type TournamentMatch } from "../api/api";

export class TournamentController {
	private tournamentData: TournamentData | null = null;
	private match1: TournamentMatch | null = null;
	private match2: TournamentMatch | null = null;

	constructor() {
		this.initialize();
	}

	private async initialize(): Promise<void> {
		tournamentAPI.getTournamentData();
		this.tournamentData = tournamentAPI.getCurrentTournament();
		this.match1 = tournamentAPI.getMatch1();
		this.match2 = tournamentAPI.getMatch2();

		this.updateTournamentDisplay();
	}

	private async updateTournamentDisplay(): Promise<void> {
		if (!this.tournamentData) {
			return;
		}

		try {
			await this.updateRound1Matches();

			this.updateNextMatchInfo();

			this.updateWinnerDisplay();
		} catch (error) {
			console.error("トーナメント表示の更新に失敗しました:", error);
		}
	}

	private async updateRound1Matches(): Promise<void> {
		if (!this.match1 || !this.match2) {
			return;
		}

		try {
			// left match
			this.updateUserElement("user-a-span", this.match1.player1_id, this.match1.score1);
			this.updateUserElement("user-b-span", this.match2.player2_id, this.match2.score2);
			this.updateMatchPath("path-1", "path-2", this.match1);

			// right match
			this.updateUserElement("user-c-span", this.match1.player1_id, this.match1.score1);
			this.updateUserElement("user-d-span", this.match2.player2_id, this.match2.score2);
			this.updateMatchPath("path-3", "path-4", this.match1);
		} catch (error) {
			console.error("round1マッチ表示の更新に失敗しました:", error);
		}
	}


	private updateUserElement(elementId: string, userId: string, score: number): void {
		const element = document.getElementById(elementId);
		if (element) {
			element.textContent = `${userId} (Score: ${score})`;
		}

		// アバター画像も更新
		// todo : アバター画像の更新
	}

	private updateMatchPath(path1Id: string, path2Id: string, match: TournamentMatch): void {
		const path1 = document.getElementById(path1Id) as unknown as SVGElement;
		const path2 = document.getElementById(path2Id) as unknown as SVGElement;

		if (path1 && path2) {
			// 勝利者がいる場合、勝利者のパスを赤くする
			if (match.winner_id) {
				if (match.winner_id === match.player1_id) {
					path1.style.stroke = "red";
					path2.style.stroke = "gray";
				} else {
					path1.style.stroke = "gray";
					path2.style.stroke = "red";
				}
			} else {
				// 勝利者がいない場合、両方ともグレー
				path1.style.stroke = "gray";
				path2.style.stroke = "gray";
			}
		}
	}

	private updateNextMatchInfo(): void {
		if (!this.tournamentData?.next_match_id) {
			return;
		}

		const nextMatch = this.tournamentData.matches.find(m => m.id === this.tournamentData!.next_match_id);
		if (nextMatch) {
			this.updateNextMatchDisplay(nextMatch);
		}
	}

	/**
	 * 次のマッチ表示の更新
	 */
	private async updateNextMatchDisplay(match: TournamentMatch): Promise<void> {
		try {
			const nextMatchSection = document.getElementById("next-match-section");
			const nextMatchRound = document.getElementById("next-match-round");
			const nextMatchPlayers = document.getElementById("next-match-players");

			if (nextMatchSection && nextMatchRound && nextMatchPlayers) {
				nextMatchSection.style.display = "block";
				nextMatchRound.textContent = `${match.round}回戦`;
				nextMatchPlayers.textContent = `${match.player1_id} vs ${match.player2_id}`;
			}
		} catch (error) {
			console.error("次のマッチ表示の更新に失敗しました:", error);
		}
	}

	private async updateWinnerDisplay(): Promise<void> {
		if (!this.tournamentData?.winner_id) {
			return;
		}

		try {
			// 勝利者を表示する要素を作成または更新
			const winnerSection = document.createElement("div");
			winnerSection.className = "winner-section";
			winnerSection.innerHTML = `
				<h2>🏆 トーナメント優勝者 🏆</h2>
				<div class="winner-info">
					<img src="${this.tournamentData.winner_id || './src/pages/tournament/ui/avator.jpg'}" width="40" height="40">
					<span>${this.tournamentData.winner_id}</span>
				</div>
			`;

			// 既存の勝利者セクションがあれば置き換え
			const existingWinner = document.querySelector(".winner-section");
			if (existingWinner) {
				existingWinner.remove();
			}

			// メインコンテナに追加
			const mainContainer = document.querySelector(".main");
			if (mainContainer) {
				mainContainer.appendChild(winnerSection);
			}
		} catch (error) {
			console.error("勝利者表示の更新に失敗しました:", error);
		}
	}

	public destroy(): void {
		tournamentAPI.destroy();
	}
}

export function createTournamentController(): TournamentController {
	return new TournamentController();
}
