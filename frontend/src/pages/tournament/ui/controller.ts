import { TournamentModel } from "../model/model.js";

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
		this.startBtn = document.getElementById("start-tournament-btn") as HTMLButtonElement;
		this.nextMatchSection = document.getElementById("next-match-section");
		this.nextMatchRound = document.getElementById("next-match-round");
		this.nextMatchPlayers = document.getElementById("next-match-players");
		this.tournamentInfoSection = document.getElementById("tournament-info-section");
		this.participantsList = document.getElementById("participants-list");
		this.loadingIndicator = document.getElementById("loading-indicator");
		this.errorDisplay = document.getElementById("error-display");
	}

	private setupEventListeners(): void {
		if (this.startBtn) {
			this.startBtn.addEventListener("click", () => this.handleStartTournament());
		}
	}

	private setupStateChangeCallback(): void {
		this.model.setStateChangeCallback((state) => {
			this.updateUI(state);
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
				.map(participant => `<li>${participant}</li>`)
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
}