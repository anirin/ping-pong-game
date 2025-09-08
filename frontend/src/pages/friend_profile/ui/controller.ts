import {
	acceptFriend,
	deleteFriend,
	fetchFriendProfile,
} from "../model/friend_profile";

export async function mountFriendProfile(
	root: HTMLElement,
	navigate: (path: string) => void,
) {
	const pathPart = window.location.pathname.split("/");
	const id = pathPart[2];
	const res = await fetchFriendProfile(id);
	root.innerHTML = "";

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
	img.src = user.avatar_url;
	img.alt = "User Avatar";
	img.className = "avatar";

	const info = document.createElement("div");
	info.className = "friend-info";
	info.innerHTML = `
		<p class="row"><span class="label">名前:</span><span class="username" title="${user.friend_name}">${user.friend_name}</span></p>
		<p class="row"><span class="label">オンライン:</span><span class="status">${user.online_status}</span></p>			
	`;
	const buttonArea = document.createElement("div");
	buttonArea.className = "actions";

	if (user.accept_status === "accept") {
		const removeBtn = document.createElement("button");
		removeBtn.textContent = "フレンド解除";
		removeBtn.className = "submit-btn";
		removeBtn.addEventListener("click", async () => {
			const result = await deleteFriend(user.id);
			if (!result.ok) return alert(result.error);
			alert("フレンドを解除しました。");
			navigate("/friends");
		});
		buttonArea.appendChild(removeBtn);
	} else {
		const message = document.createElement("div");
		message.innerText = "承認しますか？";
		const yesBtn = document.createElement("button");
		yesBtn.textContent = "はい";
		yesBtn.className = "submit-btn";
		yesBtn.addEventListener("click", async () => {
			const result = await acceptFriend(user.id);
			if (!result.ok) return result.error;
			alert("フレンド申請を承認しました");
			navigate("/friends");
		});

		const noBtn = document.createElement("button");
		noBtn.textContent = "いいえ";
		noBtn.className = "submit-btn";
		noBtn.addEventListener("click", async () => {
			const result = await deleteFriend(user.id);
			if (!result.ok) return alert(result.error);
			alert("フレンド申請を拒否しました。");
			navigate("/friends");
		});
		buttonArea.appendChild(message);
		buttonArea.appendChild(yesBtn);
		buttonArea.appendChild(noBtn);
	}
	card.appendChild(img);
	card.appendChild(info);
	card.appendChild(buttonArea);
	root.appendChild(card);
}
