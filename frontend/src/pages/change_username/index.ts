import "../../widgets/sidebar/ui/sidebar.css";
// import headerHtml from "../../widgets/header/ui/header.html?raw";
import "../../widgets/header/ui/header.css";
import { HeaderWidget } from "@widgets/header";
import { SidebarWidget } from "@widgets/sidebar";
import { renderChangeAvatarWidget } from "../change_avatar/index";
import "./change_username.css";
import usernameFormHtml from "./change_username.html?raw";
import pageLayoutHtml from "./change_username_page.html?raw";

const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

// import { HeaderWidget } from "../../widgets/header";
// JWTトークンからペイロードをデコードするヘルパー関数 (変更なし)
function decodeJwt(token: string): any {
	try {
		const base64Url = token.split(".")[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split("")
				.map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
				.join(""),
		);
		return JSON.parse(jsonPayload);
	} catch (e) {
		return null;
	}
}

// フォームが送信されたときの処理 (変更なし)
async function handleUpdateUsernameSubmit(event: SubmitEvent) {
	event.preventDefault();
	const messageElement = document.getElementById("response-message");
	if (messageElement) {
		messageElement.textContent = "";
		messageElement.style.color = "red";
	}

	const token = localStorage.getItem("accessToken");
	if (!token) {
		if (messageElement) messageElement.textContent = "ログインが必要です。";
		return;
	}

	const decodedToken = decodeJwt(token);
	const userId = decodedToken?.id || decodedToken?.sub;
	if (!userId) {
		if (messageElement)
			messageElement.textContent =
				"ユーザーIDがトークンから取得できませんでした。";
		return;
	}

	const usernameInput = document.getElementById(
		"new-username",
	) as HTMLInputElement;
	const newUsername = usernameInput.value;

	try {
		const response = await fetch(`${VITE_BASE_URL}/users/${userId}/username`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ username: newUsername }),
		});

		const updatedUserData = await response.json();

		if (response.ok) {
			if (messageElement) {
				messageElement.style.color = "green";
				messageElement.textContent = "ユーザー名が正常に変更されました！";
			}
			const currentTokenPayload = decodeJwt(token);

			currentTokenPayload.username = updatedUserData.username;

			const headerBase64 = token.split(".")[0];
			const newPayloadBase64 = btoa(JSON.stringify(currentTokenPayload))
				.replace(/=/g, "")
				.replace(/\+/g, "-")
				.replace(/\//g, "_");
			const signature = token.split(".")[2];
			const newToken = `${headerBase64}.${newPayloadBase64}.${signature}`;

			localStorage.setItem("accessToken", newToken);

			const currentUsernameElement =
				document.getElementById("current-username");
			if (currentUsernameElement) {
				currentUsernameElement.textContent = updatedUserData.username;
			}
		} else {
			if (messageElement) {
				messageElement.textContent =
					updatedUserData.error || "変更に失敗しました。";
			}
		}
	} catch (err) {
		if (messageElement) {
			messageElement.textContent = "サーバーとの通信に失敗しました。";
		}
	}
}

export function renderChangeUsernamePage(): void {
	const app = document.getElementById("app");
	if (!app) return;

	// 1. ページ全体の骨格となるHTMLを描画 (app.innerHTMLはここで1回だけ)
	app.innerHTML = pageLayoutHtml;

	// 2. ヘッダーとサイドバーのウィジェットを初期化
	const headerHost = app.querySelector("#header-widget") as HTMLElement;
	if (headerHost) {
		HeaderWidget(headerHost);
	}
	const sidebarHost = app.querySelector("#sidebar-widget") as HTMLElement;
	if (sidebarHost) {
		SidebarWidget(sidebarHost);
	}

	// 3. ユーザー名変更フォームを描画するコンテナを取得
	const usernameContainer = document.getElementById(
		"username-widget-container",
	);
	if (usernameContainer) {
		// 3a. フォームのHTMLをコンテナに挿入
		usernameContainer.innerHTML = usernameFormHtml;

		// 3b. 現在のユーザー名を表示
		const currentUsernameElement = document.getElementById("current-username");
		if (currentUsernameElement) {
			const token = localStorage.getItem("accessToken");
			if (token) {
				const decodedToken = decodeJwt(token);
				currentUsernameElement.textContent =
					decodedToken?.username || "取得できませんでした";
			} else {
				currentUsernameElement.textContent = "（ログインしていません）";
			}
		}

		// 3c. フォームに送信イベントリスナーを設定
		const form = document.getElementById("update-username-form");
		if (form) {
			form.addEventListener("submit", handleUpdateUsernameSubmit);
		}
	}

	// 4. アバター変更ウィジェットを描画
	renderChangeAvatarWidget("avatar-widget-container");
}
