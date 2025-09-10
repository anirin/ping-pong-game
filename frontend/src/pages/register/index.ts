import registerHtml from "./register.html?raw";

const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

// handleRegisterSubmit関数をasyncにして、awaitを使えるようにする
async function handleRegisterSubmit(event: SubmitEvent): Promise<void> {
	event.preventDefault();

	// エラーメッセージを表示する要素を取得（HTML側に追加しておくと良い）
	const errorElement = document.getElementById("error-message");
	if (errorElement) {
		errorElement.textContent = ""; // 前のエラーメッセージをクリア
	}

	const emailInput = document.getElementById("email") as HTMLInputElement;
	const usernameInput = document.getElementById("username") as HTMLInputElement;
	const passwordInput = document.getElementById("password") as HTMLInputElement;

	// バックエンドに送信するデータを作成
	const userData = {
		email: emailInput.value,
		username: usernameInput.value,
		password: passwordInput.value,
	};


	try {
		// fetch APIを使ってバックエンドにPOSTリクエストを送信
		const response = await fetch(`${VITE_BASE_URL}/auth/register`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(userData), // JavaScriptオブジェクトをJSON文字列に変換
		});

		// レスポンスが成功（HTTPステータスが200番台）かどうかをチェック
		if (response.ok) {
			// 成功した場合
			alert("登録が成功しました！ログインページに移動します。");

			// ログインページへリダイレクト（パスはご自身のプロジェクトに合わせてください）
			window.location.href = "/auth";
		} else {
			// 失敗した場合 (例: emailが既に存在するなど)
			const errorData = await response.json(); // バックエンドからのエラーメッセージを取得
			console.error("Registration failed:", errorData);

			if (errorElement) {
				// バックエンドからのエラーメッセージを表示
				errorElement.textContent = errorData.message || "登録に失敗しました。";
			} else {
				alert(errorData.message || "登録に失敗しました。");
			}
		}
	} catch (err) {
		// ネットワークエラーなど、リクエスト自体が失敗した場合
		console.error("An error occurred:", err);
		if (errorElement) {
			errorElement.textContent = "サーバーとの通信に失敗しました。";
		} else {
			alert("サーバーとの通信に失敗しました。");
		}
	}
}

// renderRegisterPage関数は変更なし
export function renderRegisterPage(): void {
	const app = document.getElementById("app");
	if (!app) {
		console.error("App root element not found!");
		return;
	}

	app.innerHTML = registerHtml;

	const registerForm = document.getElementById("register-form");
	if (registerForm) {
		registerForm.addEventListener("submit", handleRegisterSubmit);
	} else {
		console.error("Register form not found!");
	}
}
