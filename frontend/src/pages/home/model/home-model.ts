import { fetchHomeData } from "@pages/home/api/home-api";

export interface HomeState {
	message: string;
}

export class HomeModel {
	private state: HomeState = {
		message: "初期メッセージ",
	};

	getState(): HomeState {
		return this.state;
	}

	updateMessage(newMessage: string): void {
		this.state.message = newMessage;
		this.render();
	}

	private render(): void {
		const content = document.getElementById("dynamic-content");
		if (content) {
			content.innerHTML = `<p>動的メッセージ: ${this.state.message}</p>`;
		}
	}

	async init(): Promise<void> {
		try {
			// const data = await fetchHomeData();
			const data = { message: "test" };
			this.updateMessage(data.message);
		} catch (error) {
			console.error("ホームモデルの初期化に失敗しました:", error);
		}
	}
}
