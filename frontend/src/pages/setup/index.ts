import setupHtml from "./setup.html?raw";
const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

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

// ユーザーが入力したコードを検証し、最終的なログインを行う関数
async function handleVerifyAndLogin(event: SubmitEvent) {
	event.preventDefault();
	const errorElement = document.getElementById("error-message");
	if (errorElement) errorElement.textContent = "";

	// 一時保存したemailを取得
	const email = sessionStorage.getItem("2fa_pending_email");
	if (!email) {
		if (errorElement)
			errorElement.textContent =
				"セッションが無効です。再度ログインしてください。";
		return;
	}

	const codeInput = document.getElementById("verify-code") as HTMLInputElement;
	const code = codeInput.value;

	try {
		// バックエンドの2FA検証エンドポイントを呼び出す
		// このエンドポイントが verify2FA メソッドを呼び出すように設定してください
		const response = await fetch(`${VITE_BASE_URL}/auth/2fa/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			// バックエンドは `token` という名前でコードを受け取るので、それに合わせる
			body: JSON.stringify({ email, token: code }),
		});

		if (response.ok) {
			const data = await response.json(); // { token: "..." } が返ってくる
			const accessToken = data.token;

			if (accessToken) {
				localStorage.setItem("accessToken", accessToken);

				const decodedToken = decodeJwt(accessToken);
				const userId = decodedToken?.id || decodedToken?.sub;
				if (!userId) {
					throw new Error("トークンからユーザーIDを取得できませんでした。");
				}

				const userProfileResponse = await fetch(
					`${VITE_BASE_URL}/users/${userId}`,
					{
						headers: {
							Authorization: `Bearer ${accessToken}`,
						},
					},
				);

				if (!userProfileResponse.ok) {
					throw new Error("ユーザー情報の取得に失敗しました。");
				}
				const userProfile = await userProfileResponse.json();

				localStorage.setItem("user", JSON.stringify(userProfile));

				window.dispatchEvent(new Event("userStateChanged"));

				sessionStorage.removeItem("2fa_pending_email");
				alert("二段階認証に成功しました！ホームページに移動します。");
				window.location.href = "/home";
			} else {
				throw new Error("サーバーから認証トークンが返されませんでした。");
			}
		} else {
			const errorData = await response.json();
			if (errorElement)
				errorElement.textContent =
					errorData.message || "認証コードが正しくありません。";
		}
	} catch (err) {
		console.error("2FA verification failed:", err);
		if (errorElement)
			errorElement.textContent = "サーバーとの通信に失敗しました。";
	}
}

// ページ描画とQRコード取得のメイン関数（こちらは変更なし）
export async function renderSetupPage(): Promise<void> {
	const app = document.getElementById("app");
	if (!app) return;
	app.innerHTML = setupHtml;

	const qrCodeImage = document.getElementById(
		"qr-code-image",
	) as HTMLImageElement;
	const secretKeyElement = document.getElementById("secret-key");
	const errorElement = document.getElementById("error-message");

	try {
		const email = sessionStorage.getItem("2fa_pending_email");
		if (!email) {
			throw new Error(
				"ユーザー情報が見つかりません。ログインからやり直してください。",
			);
		}

		const response = await fetch(`${VITE_BASE_URL}/auth/2fa/setup`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});

		if (!response.ok) throw new Error("QRコードの生成に失敗しました。");

		const data = await response.json();

		if (qrCodeImage) qrCodeImage.src = data.qrCodeImageUrl;
		if (secretKeyElement) secretKeyElement.textContent = data.secret;

		const verifyForm = document.getElementById("verify-form");
		if (verifyForm) {
			verifyForm.addEventListener("submit", handleVerifyAndLogin);
		}
	} catch (err) {
		console.error("Failed to setup 2FA page:", err);
		if (errorElement && err instanceof Error) {
			errorElement.textContent = err.message;
		}
	}
}
