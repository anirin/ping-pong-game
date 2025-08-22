import avatarHtml from './change_avatar.html?raw';

// (このファイル内でJWTデコード関数が必要なので定義します)
function decodeJwt(token: string): any { try { const base64Url = token.split('.')[1]; const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); return JSON.parse(jsonPayload); } catch (e) { return null; } }

// 選択された画像のBase64データを保持する変数
let selectedAvatarBase64: string | null = null;

// アバター保存フォームが送信されたときの処理
async function handleUpdateAvatarSubmit(event: SubmitEvent) {
    event.preventDefault();
    const messageElement = document.getElementById('avatar-response-message');
    if (messageElement) messageElement.textContent = '';

    if (!selectedAvatarBase64) {
        if (messageElement) messageElement.textContent = 'まず画像を選択してください。';
        return;
    }
    
    const token = localStorage.getItem('accessToken');
    if (!token) { if (messageElement) messageElement.textContent = 'ログインが必要です。'; return; }

    const decodedToken = decodeJwt(token);
    const userId = decodedToken?.id || decodedToken?.sub;
    if (!userId) { if (messageElement) messageElement.textContent = 'ユーザーIDが取得できませんでした。'; return; }

    try {
        const response = await fetch(`https://localhost:8080/users/${userId}/avatar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ avatar: selectedAvatarBase64 }),
        });
        const data = await response.json();
        if (response.ok) {
            if (messageElement) { messageElement.style.color = 'green'; messageElement.textContent = 'アバターが正常に変更されました！'; }
        } else {
            if (messageElement) { messageElement.style.color = 'red'; messageElement.textContent = data.error || '変更に失敗しました。'; }
        }
    } catch (err) { if (messageElement) { messageElement.style.color = 'red'; messageElement.textContent = 'サーバーとの通信に失敗しました。'; } }
}

// このアバターウィジェットを描画するためのエクスポート関数
export function renderChangeAvatarWidget(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = avatarHtml;

    const form = document.getElementById('update-avatar-form');
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    const previewImage = document.getElementById('avatar-preview') as HTMLImageElement;

    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            selectedAvatarBase64 = reader.result as string;
            previewImage.src = selectedAvatarBase64;
        };
    });
    
    if (form) {
        form.addEventListener('submit', handleUpdateAvatarSubmit);
    }
}