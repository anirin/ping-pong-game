// 1. 同じディレクトリにあるHTMLファイルをインポートします
import authHtml from "./auth.html?raw";

// 2. /authページを描画するための関数
// 'export' を付けることで、他のファイルからこの関数を呼び出せるようになります
export function renderAuthPage(): void {
	const app = document.getElementById("app");
	if (!app) {
		console.error("App root element not found!");
		return;
	}

	// HTMLをapp要素に挿入
	app.innerHTML = authHtml;

	// ボタン要素を取得
	const registerButton = document.getElementById("auth-register-btn");
	const loginButton = document.getElementById("auth-login-btn");

	// 「新規登録」ボタンがクリックされたときの処理
	if (registerButton) {
		registerButton.addEventListener("click", () => {
			// /auth/register ページに遷移
			// もしSPAルーターがあれば router.navigate('/auth/register') のように変更
			window.location.href = "/auth/register";
		});
	} else {
		console.error("Register button not found on auth page!");
	}

	// 「ログイン」ボタンがクリックされたときの処理
	if (loginButton) {
		loginButton.addEventListener("click", () => {
			// /auth/login ページに遷移
			window.location.href = "/auth/login";
		});
	} else {
		console.error("Login button not found on auth page!");
	}
}
