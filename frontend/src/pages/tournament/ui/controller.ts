import { tournamentAPI, type TournamentData, type TournamentMatch } from "../api/api";

// ユーザー情報の型定義
interface UserInfo {
	id: string;
	username: string;
	avatar: string | null;
	score: number;
}

// トーナメントコントローラークラス
export class TournamentController {
	private tournamentData: TournamentData | null = null;
	private userCache: Map<string, UserInfo> = new Map();

	constructor() {
		this.initialize();
	}

	/**
	 * コントローラーの初期化
	 */
	private async initialize(): Promise<void> {
		try {
			// トーナメントデータの更新ハンドラーを設定（初期データ受信用）
			tournamentAPI.onTournamentUpdate((data: TournamentData) => {
				this.tournamentData = data;
				this.updateTournamentDisplay();
			});

			// 初期データを取得（一度だけ）
			await tournamentAPI.getTournamentStatus();
		} catch (error) {
			console.error("トーナメントの初期化に失敗しました:", error);
		}
	}

	/**
	 * ユーザー情報を取得（キャッシュ付き）
	 */
	private async getUserInfo(userId: string): Promise<UserInfo> {
		// キャッシュに存在する場合は返す
		if (this.userCache.has(userId)) {
			return this.userCache.get(userId)!;
		}

		try {
			const token = localStorage.getItem("accessToken");
			if (!token) {
				throw new Error("アクセストークンが見つかりません");
			}

			const response = await fetch(`https://localhost:8080/users/${userId}`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!response.ok) {
				throw new Error(`ユーザー情報の取得に失敗しました: ${response.status}`);
			}

			// todo : score は別途取得が必要
			const userData = await response.json();
			const userInfo: UserInfo = {
				id: userData.id,
				username: userData.username,
				avatar: userData.avatar,
				score: userData.score,
			};

			// キャッシュに保存
			this.userCache.set(userId, userInfo);
			return userInfo;
		} catch (error) {
			console.error(`ユーザー情報の取得に失敗しました (ID: ${userId}):`, error);
			// デフォルト値を返す
			return {
				id: userId,
				username: "不明なユーザー",
				avatar: null,
				score: 0,
			};
		}
	}

	/**
	 * トーナメント表示の更新
	 */
	private async updateTournamentDisplay(): Promise<void> {
		if (!this.tournamentData) {
			return;
		}

		try {
			// round1のマッチのみ更新（left matchとright match）
			await this.updateRound1Matches();

			// 次のマッチ情報を更新
			this.updateNextMatchInfo();

			// 勝利者の表示を更新
			this.updateWinnerDisplay();
		} catch (error) {
			console.error("トーナメント表示の更新に失敗しました:", error);
		}
	}

	/**
	 * round1のマッチ表示を更新（left matchとright matchのみ）
	 */
	private async updateRound1Matches(): Promise<void> {
		if (!this.tournamentData?.matches) {
			return;
		}

		// round1のマッチのみを取得
		const round1Matches = this.tournamentData.matches.filter(match => match.round === 1);
		
		// 最大2つのマッチまで処理（left matchとright match）
		for (let i = 0; i < Math.min(round1Matches.length, 2); i++) {
			const match = round1Matches[i];
			await this.updateMatchDisplay(match, i);
		}
	}

	/**
	 * 個別マッチの表示更新
	 */
	private async updateMatchDisplay(match: TournamentMatch, matchIndex: number): Promise<void> {
		try {
			const player1Info = await this.getUserInfo(match.player1_id);
			const player2Info = await this.getUserInfo(match.player2_id);

			// マッチの位置に応じて適切な要素を更新
			this.updateUserDisplay(match, player1Info, player2Info, matchIndex);
		} catch (error) {
			console.error(`マッチ表示の更新に失敗しました (ID: ${match.id}):`, error);
		}
	}

	/**
	 * ユーザー表示の更新
	 */
	private updateUserDisplay(match: TournamentMatch, player1: UserInfo, player2: UserInfo, matchIndex: number): void {
		// matchIndex 0: left match (user-a, user-b), 1: right match (user-c, user-d)
		if (matchIndex === 0) {
			// left match
			this.updateUserElement("user-a-span", player1);
			this.updateUserElement("user-b-span", player2);
			this.updateMatchPath("path-1", "path-2", match);
		} else if (matchIndex === 1) {
			// right match
			this.updateUserElement("user-c-span", player1);
			this.updateUserElement("user-d-span", player2);
			this.updateMatchPath("path-3", "path-4", match);
		}
	}

	/**
	 * ユーザー要素の更新
	 */
	private updateUserElement(elementId: string, userInfo: UserInfo): void {
		const element = document.getElementById(elementId);
		if (element) {
			element.textContent = `${userInfo.username} (Score: ${userInfo.score})`;
		}

		// アバター画像も更新
		const userDiv = element?.closest('.user');
		if (userDiv) {
			const avatarImg = userDiv.querySelector('img');
			if (avatarImg) {
				avatarImg.src = userInfo.avatar || "./src/pages/tournament/ui/avator.jpg";
			}
		}
	}

	/**
	 * マッチパスの更新（勝利者のパスを赤くする）
	 */
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

	/**
	 * 次のマッチ情報の更新
	 */
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
			const player1Info = await this.getUserInfo(match.player1_id);
			const player2Info = await this.getUserInfo(match.player2_id);

			const nextMatchSection = document.getElementById("next-match-section");
			const nextMatchRound = document.getElementById("next-match-round");
			const nextMatchPlayers = document.getElementById("next-match-players");

			if (nextMatchSection && nextMatchRound && nextMatchPlayers) {
				nextMatchSection.style.display = "block";
				nextMatchRound.textContent = `${match.round}回戦`;
				nextMatchPlayers.textContent = `${player1Info.username} vs ${player2Info.username}`;
			}
		} catch (error) {
			console.error("次のマッチ表示の更新に失敗しました:", error);
		}
	}

	/**
	 * 勝利者表示の更新
	 */
	private async updateWinnerDisplay(): Promise<void> {
		if (!this.tournamentData?.winner_id) {
			return;
		}

		try {
			const winnerInfo = await this.getUserInfo(this.tournamentData.winner_id);
			
			// 勝利者を表示する要素を作成または更新
			const winnerSection = document.createElement("div");
			winnerSection.className = "winner-section";
			winnerSection.innerHTML = `
				<h2>🏆 トーナメント優勝者 🏆</h2>
				<div class="winner-info">
					<img src="${winnerInfo.avatar || './src/pages/tournament/ui/avator.jpg'}" width="40" height="40">
					<span>${winnerInfo.username}</span>
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

	/**
	 * コントローラーのクリーンアップ
	 */
	public destroy(): void {
		tournamentAPI.disconnect();
	}
}

// トーナメントコントローラーのインスタンスを作成するファクトリー関数
export function createTournamentController(): TournamentController {
	return new TournamentController();
}
