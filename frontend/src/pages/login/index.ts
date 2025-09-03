import loginHtml from "./login.html?raw";

async function handleLoginSubmit(event: SubmitEvent): Promise<void> {
	event.preventDefault();

	const errorElement = document.getElementById("error-message");
	if (errorElement) errorElement.textContent = "";

	const emailInput = document.getElementById("login-email") as HTMLInputElement;
	const passwordInput = document.getElementById(
		"login-password",
	) as HTMLInputElement;

	const loginData = {
		email: emailInput.value,
		password: passwordInput.value,
	};

	try {
		const response = await fetch("https://localhost:8080/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(loginData),
		});

		if (response.ok) {
			// Email/Passwordの認証が成功した
			alert("認証に成功しました。次に二段階認証を行ってください。");

			// どのユーザーが2FAを行うか識別するため、emailを一時的に保存
			sessionStorage.setItem("2fa_pending_email", loginData.email);

			// QRコードを表示する2FAセットアップページにリダイレクト
			window.location.href = "/auth/setup";
		} else {
			// ログイン失敗（Email or Passwordが違うなど）
			const errorData = await response.json();
			console.error("Login failed:", errorData);
			if (errorElement) {
				errorElement.textContent =
					errorData.message || "ログインに失敗しました。";
			}
		}
	} catch (err) {
		console.error("An error occurred:", err);
		if (errorElement) {
			errorElement.textContent = "サーバーとの通信に失敗しました。";
		}
	}
}

// renderLoginPage関数は変更なし
export function renderLoginPage(): void {
	const app = document.getElementById("app");
	if (!app) {
		console.error("App root element not found!");
		return;
	}

	app.innerHTML = loginHtml;

	const loginForm = document.getElementById("login-form");
	if (loginForm) {
		loginForm.addEventListener("submit", handleLoginSubmit);
	} else {
		console.error("Login form not found!");
	}
}
