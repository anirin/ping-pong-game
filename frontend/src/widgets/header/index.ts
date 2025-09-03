import { isLoggedIn } from "@/app/auth";
import headerHtml from "./ui/header.html?raw";
import "./ui/header.css";

export function HeaderWidget(host: HTMLElement) {
	host.innerHTML = headerHtml;

	const avatarContainer = host.querySelector<HTMLDivElement>(
		"#header-avatar-container",
	);
	const loginButton = host.querySelector<HTMLAnchorElement>(
		"#header-login-button",
	);

	if (!avatarContainer || !loginButton) {
		console.error("Header elements not found");
		return;
	}

	if (isLoggedIn()) {
		avatarContainer.classList.remove("hidden");
		loginButton.classList.add("hidden");

		const avatarImg = host.querySelector<HTMLImageElement>("#header-avatar");
		if (avatarImg) {
			const user = JSON.parse(localStorage.getItem("user") || "{}");
			const avatarUrl = user.avatar ?? "/default.png";
			avatarImg.src = avatarUrl;
		}
	} else {
		avatarContainer.classList.add("hidden");
		loginButton.classList.remove("hidden");
	}
}
