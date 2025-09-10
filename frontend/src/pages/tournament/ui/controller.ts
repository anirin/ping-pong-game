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
	private roomId: string | null = null;
	private userId: string | null = null;

	constructor(params?: { [key: string]: string }) {
		this.roomId = params?.roomId || null;
		this.userId = this.getUserId();
		this.controllerCallback = this.handleMessage.bind(this);
		this.tournamentAPI.setCallback(this.controllerCallback);
		this.initialize().catch((error) => {
			console.error("TournamentController初期化エラー:", error);
		});
	}

	private async initialize(): Promise<void> {
		// WebSocket接続を確認し、必要に応じて再接続
		await this.ensureWebSocketConnection();

		// 少し待ってからトーナメントデータを取得
		await new Promise((resolve) => setTimeout(resolve, 500));

		this.tournamentAPI.getTournamentData();
		await this.waitForTournamentData();
		this.updateTournamentDisplay();
	}

	// WebSocket接続を確保する（必要に応じて再接続）
	private async ensureWebSocketConnection(): Promise<void> {
		const wsManager = this.tournamentAPI["wsManager"];

		// roomIdが取得できない場合はエラー
		if (!this.roomId) {
			throw new Error("Room ID is required for tournament page");
		}

		// userIdが取得できない場合はエラー
		if (!this.userId) {
			throw new Error("User ID is required for tournament page");
		}

		// 既に同じルームに接続済みの場合は何もしない
		if (
			wsManager.isConnected() &&
			wsManager.getCurrentRoomId() === this.roomId
		) {
			return;
		}

		try {
			await wsManager.connect(this.roomId);
		} catch (error) {
			console.error("Failed to connect to WebSocket for tournament:", error);
			throw error;
		}
	}

	// ユーザーIDを取得
	private getUserId(): string | null {
		try {
			const token = localStorage.getItem("accessToken");
			if (!token) {
				console.error("アクセストークンが見つかりません");
				return null;
			}

			// JWTトークンをデコードしてユーザーIDを取得
			const payload = JSON.parse(atob(token.split(".")[1]));
			return payload.id || null;
		} catch (error) {
			console.error("ユーザーIDの取得に失敗しました:", error);
			return null;
		}
	}

	private async waitForTournamentData(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.isDestroyed) {
				reject(new Error("Controller is destroyed"));
				return;
			}

			let dataRetryCount = 0;
			const maxDataRetries = 50; // 5秒間待機（延長）
			const dataRetryDelay = 100;

			const checkData = () => {
				if (this.isDestroyed) {
					reject(new Error("Controller is destroyed"));
					return;
				}

				const tournamentData = this.tournamentAPI.getCurrentTournament();
				if (tournamentData) {
					this.updateLocalData();
					resolve();
				} else if (dataRetryCount >= maxDataRetries) {
					console.error(
						"Tournament data timeout - retry count:",
						dataRetryCount,
					);
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
					this.updateLocalData();
					this.updateTournamentDisplay().catch((error) => {
						console.error("トーナメント表示の更新に失敗:", error);
					});
					break;
				case "match_finished":
					this.updateLocalData();
					this.updateTournamentDisplay().catch((error) => {
						console.error("トーナメント表示の更新に失敗:", error);
					});
					break;
				case "navigate_to_match":
					this.handleNavigationToMatch(data.matchId);
					break;
				case "tournament_finished":
					this.handleTournamentFinished(data.winner_id);
					break;
				case "room_deleted":
					this.handleRoomDeleted(data);
					break;
				case "force_lobby":
					this.handleForceLobby(data);
					break;
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
		// roomIdを含めてmatchページに遷移
		navigate(`/match/${this.roomId}/${matchId}`);
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

	private handleRoomDeleted(data: any): void {
		// ルーム削除時の処理
		const reason = data?.reason || "unknown";
		const message = data?.message || "Room has been deleted.";

		// ユーザーに通知を表示
		this.showRoomDeletedNotification(message);

		// 3秒後にロビーページにナビゲート
		setTimeout(() => {
			if (!this.isDestroyed) {
				navigate("/lobby");
			}
		}, 3000);
	}

	private handleForceLobby(data: any): void {
		// 強制的にlobbyに戻す処理
		const reason = data?.reason || "unknown";
		const message =
			data?.message ||
			"A user has been disconnected for too long. Returning to lobby.";

		// ユーザーに通知を表示
		this.showForceLobbyNotification(message);

		// 3秒後にロビーページにナビゲート
		setTimeout(() => {
			if (!this.isDestroyed) {
				navigate("/lobby");
			}
		}, 3000);
	}

	private showRoomDeletedNotification(message: string): void {
		try {
			const modal = this.createModal(
				"room-deleted-modal",
				`
					<div class="room-deleted-content">
						<h2>⚠️ ルームが削除されました</h2>
						<p>${message}</p>
						<p>3秒後にロビーに戻ります...</p>
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

			const content = modal.querySelector(
				".room-deleted-content",
			) as HTMLElement;
			if (content) {
				Object.assign(content.style, {
					background: "#f8d7da",
					color: "#721c24",
					padding: "2rem",
					borderRadius: "10px",
					textAlign: "center",
					boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
					border: "1px solid #f5c6cb",
				});
			}

			document.body.appendChild(modal);
			this.autoRemoveModal(modal, 3000);
		} catch (error) {
			console.error("ルーム削除通知の表示に失敗:", error);
		}
	}

	private showForceLobbyNotification(message: string): void {
		try {
			const modal = this.createModal(
				"force-lobby-modal",
				`
					<div class="force-lobby-content">
						<h2>🔌 接続が切断されました</h2>
						<p>${message}</p>
						<p>3秒後にロビーに戻ります...</p>
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
					zIndex: "10000",
				},
			);

			// スタイルを追加
			const style = document.createElement("style");
			style.textContent = `
				.force-lobby-content {
					background: #fff3cd;
					color: #856404;
					padding: 2rem;
					border-radius: 10px;
					text-align: center;
					box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
					border: 1px solid #ffeaa7;
				}
			`;
			document.head.appendChild(style);

			document.body.appendChild(modal);
			this.autoRemoveModal(modal, 3000);
		} catch (error) {
			console.error("強制lobby通知の表示に失敗:", error);
		}
	}

	private async updateTournamentDisplay(): Promise<void> {
		if (!this.tournamentData || this.isDestroyed) {
			return;
		}

		try {
			this.updateTournamentStatus();

			if (this.tournamentData.status === "finished") {
				await this.handleTournamentFinishedDisplay();
				return;
			}

			await Promise.all([
				this.updateRound1Matches(),
				this.updateRound2Matches(),
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
			this.updateMatchDisplay(this.match1, {
				player1NameId: "player-name-1-1",
				player2NameId: "player-name-1-2",
				player1ScoreId: "player-score-1-1",
				player2ScoreId: "player-score-1-2",
				player1AvatarId: "player-avatar-1-1",
				player2AvatarId: "player-avatar-1-2",
			});

			this.updateMatchDisplay(this.match2, {
				player1NameId: "player-name-2-1",
				player2NameId: "player-name-2-2",
				player1ScoreId: "player-score-2-1",
				player2ScoreId: "player-score-2-2",
				player1AvatarId: "player-avatar-2-1",
				player2AvatarId: "player-avatar-2-2",
			});
		} catch (error) {
			console.error("round1マッチ表示の更新に失敗しました:", error);
		}
	}

	private async updateRound2Matches(): Promise<void> {
		if (!this.tournamentData || this.isDestroyed) {
			return;
		}

		try {
			const finalMatch = this.tournamentData.matches.find(
				(match) => match.round === 2,
			);
			if (finalMatch) {
				const round2Section = document.getElementById("round-2-section");
				if (round2Section) {
					round2Section.style.display = "block";
				}

				this.updateMatchDisplay(finalMatch, {
					player1NameId: "player-name-final-1",
					player2NameId: "player-name-final-2",
					player1ScoreId: "player-score-final-1",
					player2ScoreId: "player-score-final-2",
					player1AvatarId: "player-avatar-final-1",
					player2AvatarId: "player-avatar-final-2",
				});
			}
		} catch (error) {
			console.error("round2マッチ表示の更新に失敗しました:", error);
		}
	}

	private updateMatchDisplay(
		match: TournamentMatch,
		elements: {
			player1NameId: string;
			player2NameId: string;
			player1ScoreId: string;
			player2ScoreId: string;
			player1AvatarId: string;
			player2AvatarId: string;
		},
	): void {
		this.updatePlayerElement(
			elements.player1NameId,
			elements.player1ScoreId,
			elements.player1AvatarId,
			match.player1Info || { username: match.player1Id, avatar: null },
			match.score1,
		);

		this.updatePlayerElement(
			elements.player2NameId,
			elements.player2ScoreId,
			elements.player2AvatarId,
			match.player2Info || { username: match.player2Id, avatar: null },
			match.score2,
		);
	}

	private updatePlayerElement(
		nameId: string,
		scoreId: string,
		avatarId: string,
		playerInfo: { username: string; avatar: string | null },
		score: number,
	): void {
		try {
			const nameElement = document.getElementById(nameId);
			if (nameElement) {
				nameElement.textContent = playerInfo.username;
			}

			const scoreElement = document.getElementById(scoreId);
			if (scoreElement) {
				// scoreがundefinedの場合は0を表示
				const displayScore = score !== undefined ? score : 0;
				scoreElement.textContent = displayScore.toString();
			}

			const avatarElement = document.getElementById(
				avatarId,
			) as HTMLImageElement;
			if (avatarElement) {
				const avatarUrl = playerInfo.avatar || "/default.png";
				avatarElement.src = avatarUrl;
				avatarElement.alt = `${playerInfo.username}'s avatar`;
			}
		} catch (error) {
			console.error(`プレイヤー要素の更新に失敗 (${nameId}):`, error);
		}
	}

	private updateTournamentStatus(): void {
		try {
			const statusElement = document.getElementById("tournament-status");
			if (statusElement && this.tournamentData) {
				switch (this.tournamentData.status) {
					case "waiting":
						statusElement.textContent = "準備中";
						break;
					case "playing":
						statusElement.textContent = "進行中";
						break;
					case "finished":
						statusElement.textContent = "終了";
						break;
					default:
						statusElement.textContent = this.tournamentData.status;
				}
			}
		} catch (error) {
			console.error("トーナメントステータスの更新に失敗:", error);
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
				const player1Name = match.player1Info?.username || match.player1Id;
				const player2Name = match.player2Info?.username || match.player2Id;
				nextMatchPlayers.textContent = `${player1Name} vs ${player2Name}`;

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
			const winnerSection = document.getElementById("winner-section");
			const winnerName = document.getElementById("winner-name");

			if (winnerSection && winnerName) {
				winnerSection.style.display = "block";
				winnerName.textContent = this.tournamentData.winner_id;
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

export function createTournamentController(params?: {
	[key: string]: string;
}): TournamentController {
	return new TournamentController(params);
}
