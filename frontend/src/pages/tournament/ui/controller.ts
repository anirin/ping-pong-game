import type { TournamentModel } from "../model/model.js";

export class TournamentController {
	private model: TournamentModel;
	private startBtn!: HTMLButtonElement | null;
	private nextMatchSection!: HTMLElement | null;
	private nextMatchRound!: HTMLElement | null;
	private nextMatchPlayers!: HTMLElement | null;
	private tournamentInfoSection!: HTMLElement | null;
	private participantsList!: HTMLElement | null;
	private loadingIndicator!: HTMLElement | null;
	private errorDisplay!: HTMLElement | null;

	constructor(model: TournamentModel) {
		this.model = model;
		this.initializeElements();
		this.setupEventListeners();
		this.setupStateChangeCallback();
	}

	private initializeElements(): void {
		this.startBtn = document.getElementById(
			"start-tournament-btn",
		) as HTMLButtonElement;
		this.nextMatchSection = document.getElementById("next-match-section");
		this.nextMatchRound = document.getElementById("next-match-round");
		this.nextMatchPlayers = document.getElementById("next-match-players");
		this.tournamentInfoSection = document.getElementById(
			"tournament-info-section",
		);
		this.participantsList = document.getElementById("participants-list");
		this.loadingIndicator = document.getElementById("loading-indicator");
		this.errorDisplay = document.getElementById("error-display");
	}

	private setupEventListeners(): void {
		if (this.startBtn) {
			this.startBtn.addEventListener("click", () =>
				this.handleStartTournament(),
			);
		}
	}

	private setupStateChangeCallback(): void {
		this.model.setStateChangeCallback((state) => {
			this.updateUI(state);

			// tournament_startedメッセージを受け取った時にspanタグを更新
			if (state.tournament && state.currentMatch) {
				this.updateSpanValuesFromBackend(state.tournament);
			}
		});
	}

	private async handleStartTournament(): Promise<void> {
		try {
			// サンプル参加者（実際の実装では動的に取得）
			const participants = ["user1", "user2", "user3", "user4"];
			const roomId = "room1"; // 実際の実装では動的に取得
			const userId = "user1"; // 実際の実装では動的に取得

			// Modelを通じてトーナメントを開始
			await this.model.startTournament(participants, roomId, userId);
		} catch (error) {
			console.error("トーナメント開始エラー:", error);
		}
	}

	private updateUI(state: any): void {
		// ローディング状態の表示
		this.updateLoadingState(state.isLoading);

		// エラー表示
		if (state.error) {
			this.updateErrorDisplay(state.error);
		} else {
			this.clearErrorDisplay();
		}

		// 参加者リストの表示
		if (state.participants && state.participants.length > 0) {
			this.updateParticipantsList(state.participants);
		}

		// トーナメント情報の表示
		if (state.tournament) {
			this.updateTournamentInfo(state.tournament);
		}

		// 次のマッチ情報を表示
		if (state.currentMatch) {
			this.updateNextMatchDisplay(state.currentMatch);
		}
	}

	private updateLoadingState(isLoading: boolean): void {
		if (this.loadingIndicator) {
			this.loadingIndicator.style.display = isLoading ? "block" : "none";
		}
		if (this.startBtn) {
			this.startBtn.disabled = isLoading;
		}
	}

	private updateErrorDisplay(error: string): void {
		if (this.errorDisplay) {
			this.errorDisplay.textContent = `エラー: ${error}`;
			this.errorDisplay.style.display = "block";
		}
	}

	private clearErrorDisplay(): void {
		if (this.errorDisplay) {
			this.errorDisplay.style.display = "none";
		}
	}

	private updateParticipantsList(participants: string[]): void {
		if (this.participantsList) {
			this.participantsList.innerHTML = participants
				.map((participant) => `<li>${participant}</li>`)
				.join("");
		}
	}

	private updateTournamentInfo(tournament: any): void {
		if (this.tournamentInfoSection) {
			this.tournamentInfoSection.innerHTML = `
				<h3>トーナメント情報</h3>
				<p>ID: ${tournament.id}</p>
				<p>ステータス: ${tournament.status}</p>
				<p>現在のラウンド: ${tournament.currentRound}</p>
				<p>参加者数: ${tournament.participants.length}</p>
				${tournament.winner_id ? `<p>優勝者: ${tournament.winner_id}</p>` : ""}
			`;
			this.tournamentInfoSection.style.display = "block";
		}
	}

	private updateNextMatchDisplay(currentMatch: any): void {
		if (this.nextMatchSection && this.nextMatchRound && this.nextMatchPlayers) {
			this.nextMatchSection.style.display = "block";
			this.nextMatchRound.textContent = `${currentMatch.round}回戦`;
			this.nextMatchPlayers.textContent = `${currentMatch.player1_name} vs ${currentMatch.player2_name}`;
		}
	}

	// backendから受け取ったデータでspanタグを更新するメソッド
	private updateSpanValuesFromBackend(tournament: any): void {
		console.log("Updating span values from backend tournament data...");

		// 最初の4つのマッチからデータを取得
		const matches = tournament.matches || [];
		const userData: { [key: string]: { username: string; score: number } } = {};

		// マッチデータからユーザー情報を抽出
		matches.slice(0, 4).forEach((match: any, index: number) => {
			const spanId = `user-${String.fromCharCode(97 + index)}-span`; // a, b, c, d

			if (match.player1_name && match.score1 !== undefined) {
				userData[spanId] = {
					username: match.player1_name,
					score: match.score1,
				};
			}
		});

		// spanタグを更新
		Object.keys(userData).forEach((spanId) => {
			const data = userData[spanId];
			const span = document.getElementById(spanId);
			if (span) {
				span.textContent = `${data.username} (Score: ${data.score})`;
				console.log(
					`Updated ${spanId}: ${data.username} (Score: ${data.score})`,
				);
			}
		});

		// pathの色を更新
		this.updatePathColorsFromBackend(matches);
	}

	// backendデータからpathの色を更新するメソッド
	private updatePathColorsFromBackend(matches: any[]): void {
		console.log("Updating path colors from backend match data...");

		// 全てのpathをグレーにリセット
		["path-1", "path-2", "path-3", "path-4"].forEach((pathId) => {
			const path = document.getElementById(pathId) as unknown as SVGPathElement;
			if (path) path.setAttribute("stroke", "gray");
		});

		// マッチごとに勝者のpathを赤くする
		matches.slice(0, 2).forEach((match: any, index: number) => {
			const path1Id = `path-${index * 2 + 1}`;
			const path2Id = `path-${index * 2 + 2}`;

			const path1 = document.getElementById(
				path1Id,
			) as unknown as SVGPathElement;
			const path2 = document.getElementById(
				path2Id,
			) as unknown as SVGPathElement;

			if (match.score1 > match.score2 && path1) {
				path1.setAttribute("stroke", "red");
				console.log(
					`Winner: ${match.player1_name} (${match.score1}) - ${path1Id} colored red`,
				);
			} else if (match.score2 > match.score1 && path2) {
				path2.setAttribute("stroke", "red");
				console.log(
					`Winner: ${match.player2_name} (${match.score2}) - ${path2Id} colored red`,
				);
			}
		});
	}
}
