import headerHtml from "./ui/header.html?raw";
import "./ui/header.css";

export function HeaderWidget(host: HTMLElement) {
	host.innerHTML = headerHtml;
}
