import sidebarHtml from "../../widgets/sidebar/ui/sidebar.html?raw";
import settingsHtml from "./change_username.html?raw";
import "../../widgets/sidebar/ui/sidebar.css";
import { HeaderWidget } from "@widgets/header";
// import headerHtml from "../../widgets/header/ui/header.html?raw";
import "../../widgets/header/ui/header.css";
import { renderChangeAvatarWidget } from "../change_avatar/index";

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
	console.log("デバッグ情報:");
	console.log("取得したトークン:", token);
	console.log("デコードされたトークン:", decodedToken);
	console.log("抽出した userId:", userId);

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
		const response = await fetch(
			`https://localhost:8080/users/${userId}/username`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ username: newUsername }),
			},
		);

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

// ルーターから呼び出される、ページ全体を描画するためのメイン関数
export function renderChangeUsernamePage(): void {
	const app = document.getElementById("app");
	if (!app) {
		console.error("App root element (#app) not found!");
		return;
	}

	// ページレイアウトの描画 (変更なし)
	app.innerHTML = `
        <div id="page-container" style="display: flex; height: 100vh;">
            <div id="sidebar-container"></div>
            <div id="main-area" style="display: flex; flex-direction: column; flex-grow: 1;">
                <div id="header-container"></div>
                <main id="main-content" style="flex-grow: 1; padding: 40px; background-color: #f9fafb; overflow-y: auto;">
                    <div id="content-wrapper" style="display: flex; justify-content: center; gap: 40px; align-items: flex-start;">
                        <div id="username-widget-container"></div>
                        <div id="avatar-widget-container"></div>
                    </div>
                </main>
            </div>
        </div>
    `;

	const headerContainer = document.getElementById("header-container");
	if (headerContainer) {
		headerContainer.innerHTML = `<div id="header-widget"></div>`;
		const headerHost = headerContainer.querySelector(
			"#header-widget",
		) as HTMLElement;
		if (headerHost) {
			HeaderWidget(headerHost);
		}
	}
	const sidebarContainer = document.getElementById("sidebar-container");
	if (sidebarContainer) sidebarContainer.innerHTML = sidebarHtml;

	const usernameContainer = document.getElementById(
		"username-widget-container",
	);
	if (usernameContainer) {
		// 1. ユーザー名ウィジェットのHTMLを描画
		usernameContainer.innerHTML = settingsHtml;

		// ★★★ ここからが追加・修正の処理 ★★★
		// 2. 現在のユーザー名を表示する要素を取得
		const currentUsernameElement = document.getElementById("current-username");
		if (currentUsernameElement) {
			const token = localStorage.getItem("accessToken");
			if (token) {
				const decodedToken = decodeJwt(token);
				// 3. バックエンドがJWTに含めるキー名（'username'など）に合わせてください
				const currentUsername = decodedToken?.username;
				if (currentUsername) {
					// 4. 要素のテキストとしてユーザー名を設定
					currentUsernameElement.textContent = currentUsername;
				} else {
					currentUsernameElement.textContent = "取得できませんでした";
				}
			} else {
				currentUsernameElement.textContent = "（ログインしていません）";
			}
		}
		// ★★★ ここまでが追加・修正の処理 ★★★

		// 5. フォームにイベントリスナーを設定 (これは元のまま)
		const form = document.getElementById("update-username-form");
		if (form) {
			form.addEventListener("submit", handleUpdateUsernameSubmit);
		}
	}

	// アバターウィジェットの描画 (変更なし)
	renderChangeAvatarWidget("avatar-widget-container");
}
