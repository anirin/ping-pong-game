import { fetchFriendById, sendFriendRequest } from "../model/friend_request";

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

export async function mountFriendRequest(
	root: HTMLElement,
	navigate: (path: string) => void,
) {
	const myIdBox = root.querySelector("#my-id-box") as HTMLElement;
	const token = localStorage.getItem("accessToken");
	if (token) {
		const decoded = decodeJwt(token);
		const userId = decoded?.id || decoded?.sub;
		if (!userId) {
			alert("ユーザーIDを取得できません");
			navigate("/auth/login");
			return;
		}
		if (userId) {
			myIdBox.innerHTML = `
			<span class="my-id-label">あなたのID:</span>
			<span class="my-id-value" title=${userId}">${userId}</span>
			`;
		} else {
			myIdBox.textContent = "ユーザーIDを取得できません";
		}
	} else {
		myIdBox.textContent = "ログインしてください";
	}

	const searchBtn = root.querySelector("#search-btn") as HTMLButtonElement;
	const input = root.querySelector("#friend-id") as HTMLInputElement;
	const result = root.querySelector("#search-result") as HTMLElement;

	searchBtn.addEventListener("click", async () => {
		const friendId = input.value.trim();
		if (!friendId) {
			result.innerHTML = `<p style="color:red;">IDを入力してください</p>`;
			return;
		}
		const res = await fetchFriendById(friendId);
		result.innerHTML = "";

		if (res.ok === false) {
			alert(res.error);
			if (res.error === "ログインしてください") navigate("/auth/login");
			return;
		}

		const user = res.value;
		const card = document.createElement("div");
		card.className = "friend-card";

		const img = document.createElement("img");
		img.src = user.avatar || "/default.png";
		img.alt = "User Avatar";
		img.className = "avatar";

		const info = document.createElement("div");
		info.className = "friend-info";
		info.innerHTML = `
			<p class="row"><strong class="label">名前:</strong><span class="username" title="${user.username}">${user.username}</span></p>
			<p class="row"><strong class="label">オンライン:</strong><span class="status">${user.status}</span></p>			
		`;

		const addBtn = document.createElement("button");
		addBtn.textContent = "フレンド申請";
		addBtn.className = "submit-btn";

		addBtn.addEventListener("click", async () => {
			const res = await sendFriendRequest(user.id);
			if (res.ok) {
				alert(`${user.username}にフレンドを申請しました！`);
				addBtn.disabled = true;
				addBtn.textContent = "申請済み";
			} else {
				alert(res.error);
			}
		});
		card.appendChild(img);
		card.appendChild(info);
		card.appendChild(addBtn);
		result.appendChild(card);
	});
}
