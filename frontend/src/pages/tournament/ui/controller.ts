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
		console.log("TournamentController constructor", params);
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
			console.log(`Already connected to room ${this.roomId} for tournament`);
			return;
		}

		console.log(`Connecting to room ${this.roomId} for tournament`);

		try {
			await wsManager.connect(this.roomId);
			console.log("WebSocket connection established for tournament");
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
					console.log("Tournament data received:", tournamentData);
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
					console.log(
						`Waiting for tournament data... (${dataRetryCount}/${maxDataRetries})`,
					);
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
				case "room_deleted":
					console.log("TournamentController: ルーム削除を受信", data);
					this.handleRoomDeleted(data);
					break;
				case "force_lobby":
					console.log("TournamentController: 強制lobby遷移を受信", data);
					this.handleForceLobby(data);
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

		console.log(
			`Tournament room deleted - Reason: ${reason}, Message: ${message}`,
		);

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
		const message = data?.message || "A user has been disconnected for too long. Returning to lobby.";

		console.log(
			`Tournament force lobby - Reason: ${reason}, Message: ${message}`,
		);

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

export function createTournamentController(params?: {
	[key: string]: string;
}): TournamentController {
	return new TournamentController(params);
}
