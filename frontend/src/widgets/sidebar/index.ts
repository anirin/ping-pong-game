import sidebarHtml from "./ui/sidebar.html?raw";
import "./ui/sidebar.css";

function isLoggedIn(): boolean {
	const token = localStorage.getItem("accessToken");
	return token !== null && token !== "";
}

function handleLogout(): void {
	console.log("Logging out...");
	localStorage.removeItem("accessToken");
	localStorage.removeItem("refreshToken");
	window.location.href = "/auth";
}

export function SidebarWidget(host: HTMLElement): void {
	host.innerHTML = sidebarHtml;
	const logoutButton = host.querySelector<HTMLButtonElement>("#logout-button");
	const logoutListItem = host.querySelector<HTMLLIElement>(".logout-item");

	if (isLoggedIn()) {
		if (logoutButton && logoutListItem) {
			logoutListItem.style.display = "block";
			logoutButton.addEventListener("click", handleLogout);
		} else {
			console.error("Logout button or its list item not found.");
		}
	} else {
		if (logoutListItem) {
			logoutListItem.style.display = "none";
		}
	}
}
