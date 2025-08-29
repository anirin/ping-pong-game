import headerHtml from "./ui/header.html?raw";
import "./ui/header.css";

export function HeaderWidget(host: HTMLElement) {
	host.innerHTML = headerHtml;
	const avatarImg = host.querySelector(
		"#header-avatar",
	) as HTMLImageElement | null;
	if (avatarImg) {
		const user = JSON.parse(localStorage.getItem("user") || "{}");
		const avatarUrl = user.avatar ?? "/default.png";
		avatarImg.src = avatarUrl;
	}
}
