import {
	type TournamentData,
	type TournamentMatch,
	tournamentAPI,
} from "../api/api";

export class TournamentController {
	private tournamentData: TournamentData | null = null;
	private match1: TournamentMatch | null = null;
	private match2: TournamentMatch | null = null;
	private dataUpdateCallback: () => void;

	constructor() {
		// TournamentAPI をリセットしてクリーンな状態にする
		tournamentAPI.reset();
		
		// データ更新コールバックを設定
		this.dataUpdateCallback = this.handleDataUpdate.bind(this);
		tournamentAPI.addDataUpdateCallback(this.dataUpdateCallback);
		this.initialize();
	}

	private async initialize(): Promise<void> {
		// WebSocket接続を確認
		await this.waitForWebSocketConnection();
		
		// WebSocketでデータを要求
		tournamentAPI.getTournamentData();

		// データが受信されるまで待機（ポーリングまたはイベントリスナー）
		await this.waitForTournamentData();

		// データが準備できてから更新
		this.updateTournamentDisplay();
	}

	private async waitForWebSocketConnection(): Promise<void> {
		return new Promise((resolve) => {
			const checkConnection = () => {
				const wsManager = tournamentAPI['wsManager'];
				if (wsManager.isConnected()) {
					console.log("WebSocket is connected, proceeding with tournament data request");
					resolve();
				} else {
					console.log("WebSocket is not connected, waiting...");
					// 100ms後に再チェック
					setTimeout(checkConnection, 100);
				}
			};
			checkConnection();
		});
	}

	private async waitForTournamentData(): Promise<void> {
		return new Promise((resolve) => {
			const checkData = () => {
				if (tournamentAPI.getCurrentTournament()) {
					this.updateLocalData();
					resolve();
				} else {
					// 100ms後に再チェック
					setTimeout(checkData, 100);
				}
			};
			checkData();
		});
	}

	private updateLocalData(): void {
		this.tournamentData = tournamentAPI.getCurrentTournament();
		this.match1 = tournamentAPI.getMatch1();
		this.match2 = tournamentAPI.getMatch2();
	}

	private handleDataUpdate(): void {
		console.log("TournamentController: データ更新を受信");
		this.updateLocalData();
		this.updateTournamentDisplay();
	}

	private async updateTournamentDisplay(): Promise<void> {
		if (!this.tournamentData) {
			return;
		}

		try {
			// トーナメントが終了している場合の特別処理
			if (this.tournamentData.status === "finished") {
				await this.handleTournamentFinished();
				return;
			}

			await this.updateRound1Matches();
			await this.updateNextMatchInfo();
			await this.updateWinnerDisplay();
		} catch (error) {
			console.error("トーナメント表示の更新に失敗しました:", error);
		}
	}

	private async updateRound1Matches(): Promise<void> {
		if (!this.match1 || !this.match2) {
			return;
		}

		try {
			// left match - プロパティ名を修正
			this.updateUserElement(
				"user-a-span",
				this.match1.player1Id,
				this.match1.score1,
			);
			this.updateUserElement(
				"user-b-span",
				this.match1.player2Id,
				this.match1.score2,
			);
			this.updateMatchPath("path-1", "path-2", this.match1);

			// right match - プロパティ名を修正
			this.updateUserElement(
				"user-c-span",
				this.match2.player1Id,
				this.match2.score1,
			);
			this.updateUserElement(
				"user-d-span",
				this.match2.player2Id,
				this.match2.score2,
			);
			this.updateMatchPath("path-3", "path-4", this.match2);
		} catch (error) {
			console.error("round1マッチ表示の更新に失敗しました:", error);
		}
	}

	private updateUserElement(
		elementId: string,
		userId: string,
		score: number,
	): void {
		const element = document.getElementById(elementId);
		if (element) {
			element.textContent = `${userId} (Score: ${score})`;
		}

		// アバター画像も更新
		// todo : アバター画像の更新
	}

	private updateMatchPath(
		path1Id: string,
		path2Id: string,
		match: TournamentMatch,
	): void {
		const path1 = document.getElementById(path1Id) as unknown as SVGElement;
		const path2 = document.getElementById(path2Id) as unknown as SVGElement;

		if (path1 && path2) {
			// 勝利者がいる場合、勝利者のパスを赤くする - プロパティ名を修正
			if (match.winnerId) {
				if (match.winnerId === match.player1Id) {
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

		const nextMatch = this.tournamentData.matches.find(
			(m) => m.id === this.tournamentData!.next_match_id,
		);
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
				// プロパティ名を修正
				nextMatchPlayers.textContent = `${match.player1Id} vs ${match.player2Id}`;
				
				// ボタンのonclickイベントを設定
				const goToMatchBtn = document.getElementById("go-to-match-btn");
				if (goToMatchBtn) {
					goToMatchBtn.onclick = () => this.goToNextMatch(match.id);
				}
			}
		} catch (error) {
			console.error("次のマッチ表示の更新に失敗しました:", error);
		}
	}

	private goToNextMatch(matchId: string): void {
		tournamentAPI.navigateToMatch(matchId);
	}

	// トーナメント終了時の処理
	private async handleTournamentFinished(): Promise<void> {
		if (!this.tournamentData?.winner_id) {
			return;
		}

		try {
			// 勝利者表示を更新
			await this.updateWinnerDisplay();
			
			// トーナメント終了メッセージを表示
			this.showTournamentFinishedMessage();
		} catch (error) {
			console.error("トーナメント終了処理に失敗しました:", error);
		}
	}

	// トーナメント終了メッセージの表示
	private showTournamentFinishedMessage(): void {
		const messageDiv = document.createElement("div");
		messageDiv.className = "tournament-finished-message";
		messageDiv.innerHTML = `
			<div class="message-content">
				<h2>🏆 トーナメント終了 🏆</h2>
				<p>お疲れ様でした！</p>
			</div>
		`;
		
		// スタイルを追加
		messageDiv.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: rgba(0, 0, 0, 0.9);
			color: white;
			padding: 2rem;
			border-radius: 10px;
			text-align: center;
			z-index: 1000;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
		`;
		
		document.body.appendChild(messageDiv);
		
		// 5秒後にメッセージを削除
		setTimeout(() => {
			if (messageDiv.parentNode) {
				messageDiv.parentNode.removeChild(messageDiv);
			}
		}, 5000);
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
					<img src="${this.tournamentData.winner_id || "./src/pages/tournament/ui/avator.jpg"}" width="40" height="40">
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
		tournamentAPI.removeDataUpdateCallback(this.dataUpdateCallback);
		tournamentAPI.destroy();
	}
}

export function createTournamentController(): TournamentController {
	return new TournamentController();
}
