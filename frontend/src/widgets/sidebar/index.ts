import sidebarHtml from "./ui/sidebar.html?raw";
import "./ui/sidebar.css";

function isLoggedIn(): boolean {
	const token = localStorage.getItem("accessToken");
	return token !== null && token !== "";
}

async function handleLogout(): Promise<void> {
	console.log("Logging out...");

	const token = localStorage.getItem("accessToken");
	if (token) {
		try {
			const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;
			if (!VITE_BASE_URL) {
				console.error("VITE_BASE_URL is not configured.");
			} else {
				const response = await fetch(`${VITE_BASE_URL}/auth/logout`, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (!response.ok) {
					console.error(
						"Failed to notify backend of logout. Status:",
						response.status,
					);
				} else {
					console.log(
						"Successfully notified backend to set user status to offline.",
					);
				}
			}
		} catch (error) {
			console.error("Error while sending logout request to backend:", error);
		}
	}
	localStorage.removeItem("accessToken");
	localStorage.removeItem("refreshToken");

	window.location.href = "/home";
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
