import { fetchFriendById, sendFriendRequest } from "../model/friend_request";
// import avatar from "./a.jpg";

export async function mountFriendRequest(
	root: HTMLElement,
) {
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
			const messageEl = document.createElement("p");
			messageEl.textContent = "ログインされていません。";
			messageEl.style.color = "#888";
			messageEl.style.textAlign = "center";
			root.appendChild(messageEl);
			return;
		}

		const user = res.value;
		const card = document.createElement("div");
		card.className = "friend-card";

		const img = document.createElement("img");
		img.src = user.avatar;
		img.alt = "null";
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
