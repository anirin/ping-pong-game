import { navigate } from "../../../app/routing/index.js";
import {
	TournamentAPI,
	type TournamentData,
	type TournamentMatch,
} from "../api/api";

export class TournamentController {
	private tournamentData: TournamentData | null = null;
	private match1: TournamentMatch | null = null;
	private match2: TournamentMatch | null = null;
	private controllerCallback: (data: any, action?: string) => void;
	private tournamentAPI: TournamentAPI = new TournamentAPI();
	private isDestroyed: boolean = false;
	private connectionRetryCount: number = 0;
	private readonly maxRetryAttempts: number = 5;
	private readonly retryDelay: number = 1000;

	constructor() {
		console.log("TournamentController constructor");
		this.controllerCallback = this.handleMessage.bind(this);
		this.tournamentAPI.setCallback(this.controllerCallback);
		this.initialize().catch((error) => {
			console.error("TournamentController初期化エラー:", error);
		});
	}

	private async initialize(): Promise<void> {
		await this.waitForWebSocketConnection();
		this.tournamentAPI.getTournamentData();
		await this.waitForTournamentData();
		this.updateTournamentDisplay();
	}

	private async waitForWebSocketConnection(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.isDestroyed) {
				reject(new Error("Controller is destroyed"));
				return;
			}

			const checkConnection = () => {
				if (this.isDestroyed) {
					reject(new Error("Controller is destroyed"));
					return;
				}

				const wsManager = this.tournamentAPI["wsManager"];
				if (wsManager.isConnected()) {
					console.log(
						"WebSocket is connected, proceeding with tournament data request",
					);
					this.connectionRetryCount = 0;
					resolve();
				} else if (this.connectionRetryCount >= this.maxRetryAttempts) {
					reject(
						new Error(
							`WebSocket接続に失敗しました。最大試行回数(${this.maxRetryAttempts})に達しました。`,
						),
					);
				} else {
					this.connectionRetryCount++;
					console.log(
						`WebSocket is not connected, waiting... (試行回数: ${this.connectionRetryCount}/${this.maxRetryAttempts})`,
					);
					setTimeout(checkConnection, this.retryDelay);
				}
			};
			checkConnection();
		});
	}

	private async waitForTournamentData(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.isDestroyed) {
				reject(new Error("Controller is destroyed"));
				return;
			}

			let dataRetryCount = 0;
			const maxDataRetries = 30; // 3秒間待機
			const dataRetryDelay = 100;

			const checkData = () => {
				if (this.isDestroyed) {
					reject(new Error("Controller is destroyed"));
					return;
				}

				if (this.tournamentAPI.getCurrentTournament()) {
					this.updateLocalData();
					resolve();
				} else if (dataRetryCount >= maxDataRetries) {
					reject(new Error("トーナメントデータの取得に失敗しました。"));
				} else {
					dataRetryCount++;
					setTimeout(checkData, dataRetryDelay);
				}
			};
			checkData();
		});
	}

	private updateLocalData(): void {
		this.tournamentData = this.tournamentAPI.getCurrentTournament();
		this.match1 = this.tournamentAPI.getMatch(0);
		this.match2 = this.tournamentAPI.getMatch(1);
	}

	private handleMessage(data: any, action?: string): void {
		if (this.isDestroyed) {
			return;
		}

		try {
			switch (action) {
				case "data_update":
					console.log("TournamentController: データ更新を受信");
					this.updateLocalData();
					this.updateTournamentDisplay().catch((error) => {
						console.error("トーナメント表示の更新に失敗:", error);
					});
					break;
				case "navigate_to_match":
					console.log(
						"TournamentController: マッチへのナビゲーションを受信",
						data.matchId,
					);
					this.handleNavigationToMatch(data.matchId);
					break;
				case "tournament_finished":
					console.log(
						"TournamentController: トーナメント終了を受信",
						data.winner_id,
						data.tournament_id,
					);
					this.handleTournamentFinished(data.winner_id);
					break;
				default:
					console.log("TournamentController: 不明なアクション", action);
			}
		} catch (error) {
			console.error("メッセージ処理中にエラーが発生:", error);
		}
	}

	private handleNavigationToMatch(matchId: string): void {
		if (!matchId) {
			console.error("マッチIDが指定されていません");
			return;
		}
		navigate(`/match/${matchId}`);
	}

	private handleTournamentFinished(winnerId: string): void {
		if (!winnerId) {
			console.error("優勝者IDが指定されていません");
			return;
		}

		this.showTournamentWinner(winnerId);
		setTimeout(() => {
			if (!this.isDestroyed) {
				navigate("/room");
			}
		}, 3000);
	}

	private async updateTournamentDisplay(): Promise<void> {
		if (!this.tournamentData || this.isDestroyed) {
			return;
		}

		try {
			if (this.tournamentData.status === "finished") {
				await this.handleTournamentFinishedDisplay();
				return;
			}

			await Promise.all([
				this.updateRound1Matches(),
				this.updateNextMatchInfo(),
				this.updateWinnerDisplay(),
			]);
		} catch (error) {
			console.error("トーナメント表示の更新に失敗しました:", error);
		}
	}

	private async updateRound1Matches(): Promise<void> {
		if (!this.match1 || !this.match2 || this.isDestroyed) {
			return;
		}

		try {
			// マッチ1の更新
			this.updateMatchDisplay(this.match1, {
				user1Id: "user-a-span",
				user2Id: "user-b-span",
				path1Id: "path-1",
				path2Id: "path-2",
			});

			// マッチ2の更新
			this.updateMatchDisplay(this.match2, {
				user1Id: "user-c-span",
				user2Id: "user-d-span",
				path1Id: "path-3",
				path2Id: "path-4",
			});
		} catch (error) {
			console.error("round1マッチ表示の更新に失敗しました:", error);
		}
	}

	private updateMatchDisplay(
		match: TournamentMatch,
		elements: {
			user1Id: string;
			user2Id: string;
			path1Id: string;
			path2Id: string;
		},
	): void {
		this.updateUserElement(elements.user1Id, match.player1Id, match.score1);
		this.updateUserElement(elements.user2Id, match.player2Id, match.score2);
		this.updateMatchPath(elements.path1Id, elements.path2Id, match);
	}

	private updateUserElement(
		elementId: string,
		userId: string,
		score: number,
	): void {
		try {
			const element = document.getElementById(elementId);
			if (element) {
				element.textContent = `${userId} (Score: ${score})`;
			} else {
				console.warn(`要素が見つかりません: ${elementId}`);
			}
		} catch (error) {
			console.error(`ユーザー要素の更新に失敗 (${elementId}):`, error);
		}
	}

	private updateMatchPath(
		path1Id: string,
		path2Id: string,
		match: TournamentMatch,
	): void {
		try {
			const path1 = document.getElementById(path1Id) as unknown as SVGElement;
			const path2 = document.getElementById(path2Id) as unknown as SVGElement;

			if (!path1 || !path2) {
				console.warn(`パス要素が見つかりません: ${path1Id}, ${path2Id}`);
				return;
			}

			if (match.winnerId) {
				if (match.winnerId === match.player1Id) {
					path1.style.stroke = "red";
					path2.style.stroke = "gray";
				} else {
					path1.style.stroke = "gray";
					path2.style.stroke = "red";
				}
			} else {
				path1.style.stroke = "gray";
				path2.style.stroke = "gray";
			}
		} catch (error) {
			console.error(`マッチパスの更新に失敗 (${path1Id}, ${path2Id}):`, error);
		}
	}

	private updateNextMatchInfo(): void {
		if (!this.tournamentData?.next_match_id || this.isDestroyed) {
			return;
		}

		const nextMatch = this.tournamentData.matches.find(
			(m) => m.id === this.tournamentData!.next_match_id,
		);
		if (nextMatch) {
			this.updateNextMatchDisplay(nextMatch).catch((error) => {
				console.error("次のマッチ情報の更新に失敗:", error);
			});
		}
	}

	private async updateNextMatchDisplay(match: TournamentMatch): Promise<void> {
		try {
			const nextMatchSection = document.getElementById("next-match-section");
			const nextMatchRound = document.getElementById("next-match-round");
			const nextMatchPlayers = document.getElementById("next-match-players");

			if (nextMatchSection && nextMatchRound && nextMatchPlayers) {
				nextMatchSection.style.display = "block";
				nextMatchRound.textContent = `${match.round}回戦`;
				nextMatchPlayers.textContent = `${match.player1Id} vs ${match.player2Id}`;

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
		this.tournamentAPI.navigateToMatch(matchId);
	}

	private showTournamentWinner(winnerId: string): void {
		try {
			const modal = this.createModal(
				"tournament-winner-modal",
				`
					<div class="winner-content">
						<h1>🏆 トーナメント終了 🏆</h1>
						<h2>優勝者: ${winnerId}</h2>
						<p>3秒後にルームページに戻ります...</p>
					</div>
				`,
				{
					position: "fixed",
					top: "0",
					left: "0",
					width: "100%",
					height: "100%",
					background: "rgba(0, 0, 0, 0.8)",
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					zIndex: "1000",
				},
			);

			const content = modal.querySelector(".winner-content") as HTMLElement;
			if (content) {
				Object.assign(content.style, {
					background: "white",
					padding: "2rem",
					borderRadius: "10px",
					textAlign: "center",
					boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
				});
			}

			document.body.appendChild(modal);
			this.autoRemoveModal(modal, 3000);
		} catch (error) {
			console.error("トーナメント優勝者表示に失敗:", error);
		}
	}

	private async handleTournamentFinishedDisplay(): Promise<void> {
		if (!this.tournamentData?.winner_id) {
			return;
		}

		try {
			await this.updateWinnerDisplay();
			this.showTournamentFinishedMessage();
		} catch (error) {
			console.error("トーナメント終了処理に失敗しました:", error);
		}
	}

	private showTournamentFinishedMessage(): void {
		try {
			const modal = this.createModal(
				"tournament-finished-message",
				`
					<div class="message-content">
						<h2>🏆 トーナメント終了 🏆</h2>
						<p>お疲れ様でした！</p>
					</div>
				`,
				{
					position: "fixed",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					background: "rgba(0, 0, 0, 0.9)",
					color: "white",
					padding: "2rem",
					borderRadius: "10px",
					textAlign: "center",
					zIndex: "1000",
					boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
				},
			);

			document.body.appendChild(modal);
			this.autoRemoveModal(modal, 5000);
		} catch (error) {
			console.error("トーナメント終了メッセージ表示に失敗:", error);
		}
	}

	private async updateWinnerDisplay(): Promise<void> {
		if (!this.tournamentData?.winner_id) {
			return;
		}

		try {
			const winnerSection = document.createElement("div");
			winnerSection.className = "winner-section";
			winnerSection.innerHTML = `
				<h2>🏆 トーナメント優勝者 🏆</h2>
				<div class="winner-info">
					<img src="${this.tournamentData.winner_id || "./src/pages/tournament/ui/avator.jpg"}" width="40" height="40">
					<span>${this.tournamentData.winner_id}</span>
				</div>
			`;

			const existingWinner = document.querySelector(".winner-section");
			if (existingWinner) {
				existingWinner.remove();
			}

			const mainContainer = document.querySelector(".main");
			if (mainContainer) {
				mainContainer.appendChild(winnerSection);
			}
		} catch (error) {
			console.error("勝利者表示の更新に失敗しました:", error);
		}
	}

	// 共通のモーダル作成メソッド
	private createModal(
		className: string,
		innerHTML: string,
		styles: Record<string, string>,
	): HTMLElement {
		const modal = document.createElement("div");
		modal.className = className;
		modal.innerHTML = innerHTML;
		Object.assign(modal.style, styles);
		return modal;
	}

	// モーダルの自動削除メソッド
	private autoRemoveModal(modal: HTMLElement, delay: number): void {
		setTimeout(() => {
			if (modal.parentNode && !this.isDestroyed) {
				modal.parentNode.removeChild(modal);
			}
		}, delay);
	}

	public destroy(): void {
		this.isDestroyed = true;
		this.tournamentAPI.removeCallback();
		this.tournamentAPI.destroy();

		// 既存のモーダルをクリーンアップ
		const existingModals = document.querySelectorAll(
			".tournament-winner-modal, .tournament-finished-message",
		);
		existingModals.forEach((modal) => {
			if (modal.parentNode) {
				modal.parentNode.removeChild(modal);
			}
		});
	}
}

export function createTournamentController(): TournamentController {
	return new TournamentController();
}
