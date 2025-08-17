import setupHtml from './setup.html?raw';

// ユーザーが入力したコードを検証し、最終的なログインを行う関数
async function handleVerifyAndLogin(event: SubmitEvent) {
    event.preventDefault();
    const errorElement = document.getElementById('error-message');
    if (errorElement) errorElement.textContent = '';
    
    // 一時保存したemailを取得
    const email = sessionStorage.getItem('2fa_pending_email'); 
    if (!email) {
        if(errorElement) errorElement.textContent = 'セッションが無効です。再度ログインしてください。';
        return;
    }

    const codeInput = document.getElementById('verify-code') as HTMLInputElement;
    const code = codeInput.value;

    try {
        // バックエンドの2FA検証エンドポイントを呼び出す
        // このエンドポイントが verify2FA メソッドを呼び出すように設定してください
        const response = await fetch('http://localhost:8080/auth/2fa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // バックエンドは `token` という名前でコードを受け取るので、それに合わせる
            body: JSON.stringify({ email, token: code }), 
        });

        if (response.ok) {
            const data = await response.json(); // { token: "..." } が返ってくる
            
            if (data.token) {
                // 最終的なJWTトークンをlocalStorageに保存
                // 保存するキー名は 'accessToken' のままでOKです
                localStorage.setItem('accessToken', data.token); 
                
                sessionStorage.removeItem('2fa_pending_email'); // 一時保存したemailを削除
                alert('二段階認証に成功しました！ホームページに移動します。');
                window.location.href = '/home'; // ログイン完了、ホームページへ
            } else {
                 throw new Error('サーバーから認証トークンが返されませんでした。');
            }
        } else {
            const errorData = await response.json();
            if (errorElement) errorElement.textContent = errorData.message || '認証コードが正しくありません。';
        }
    } catch (err) {
        console.error('2FA verification failed:', err);
        if (errorElement) errorElement.textContent = 'サーバーとの通信に失敗しました。';
    }
}

// ページ描画とQRコード取得のメイン関数（こちらは変更なし）
export async function renderSetupPage(): Promise<void> {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = setupHtml;

    const qrCodeImage = document.getElementById('qr-code-image') as HTMLImageElement;
    const secretKeyElement = document.getElementById('secret-key');
    const errorElement = document.getElementById('error-message');
    
    try {
        const email = sessionStorage.getItem('2fa_pending_email');
        if (!email) {
            throw new Error('ユーザー情報が見つかりません。ログインからやり直してください。');
        }

        const response = await fetch('http://localhost:8080/auth/2fa/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) throw new Error('QRコードの生成に失敗しました。');

        const data = await response.json();

        if (qrCodeImage) qrCodeImage.src = data.qrCodeImageUrl;
        if (secretKeyElement) secretKeyElement.textContent = data.secret;

        const verifyForm = document.getElementById('verify-form');
        if (verifyForm) {
            verifyForm.addEventListener('submit', handleVerifyAndLogin);
        }

    } catch (err) {
        console.error('Failed to setup 2FA page:', err);
        if (errorElement && err instanceof Error) {
            errorElement.textContent = err.message;
        }
    }
}