import html from "./ui/tournament.html?raw";
import "./ui/tournament.css";

export function renderTournamentPage() {
	const app = document.getElementById("app")!;
	app.innerHTML = html;

}
