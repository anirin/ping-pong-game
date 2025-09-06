import { HeaderWidget } from "@/widgets/header"; // パスはプロジェクトに合わせて調整してください
import { SidebarWidget } from "@/widgets/sidebar"; // パスはプロジェクトに合わせて調整してください
import { navigate } from "../../app/routing/index.js";
import guestTournamentHtml from "./tournament_guest.html?raw";
import "./tournament_guest.css";

export let guestPlayers: string[] = [];

export function renderGuestTournamentPage() {
	const app = document.getElementById("app")!;
	app.innerHTML = guestTournamentHtml;

	const headerHost = document.getElementById("header-widget");
	if (headerHost) {
		HeaderWidget(headerHost);
	}
	const sidebarHost = document.getElementById("sidebar-widget");
	if (sidebarHost) {
		SidebarWidget(sidebarHost);
	}

	const form = document.getElementById("guest-tournament-form");
	form?.addEventListener("submit", (e) => {
		e.preventDefault();

		const p1 = (document.getElementById("player1-name") as HTMLInputElement)
			.value;
		const p2 = (document.getElementById("player2-name") as HTMLInputElement)
			.value;
		const p3 = (document.getElementById("player3-name") as HTMLInputElement)
			.value;
		const p4 = (document.getElementById("player4-name") as HTMLInputElement)
			.value;

		guestPlayers = [p1, p2, p3, p4];
		console.log("トーナメント参加者:", guestPlayers);
		
		// プレイヤー名をURLクエリパラメータとして渡してトーナメント画面に遷移
		const queryParams = new URLSearchParams({
			player1: p1,
			player2: p2,
			player3: p3,
			player4: p4
		});
		navigate(`/tournament_guest?${queryParams.toString()}`);
	});
}
