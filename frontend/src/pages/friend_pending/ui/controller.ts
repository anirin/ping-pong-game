import { fetchFriends } from "../model/friend_pending";

export async function mountFriendPending(
	root: HTMLElement,
	navigate: (path: string) => void,
) {
	const res = await fetchFriends();
	root.innerHTML = "";

	// if (res.ok === false) {
	// 	alert(res.error);
	// 	if (res.error === "ログインしてください") navigate("/auth/login");
	// 	return;
	// }

	const friends = res.value;

	// friend profileの表示
	friends.forEach((friend) => {
		const card = document.createElement("div");
		card.className = "friend-profile";

		const img = document.createElement("img");

		img.src = friend.avatar_url;
		// 設定していない時のavatorの表示
		img.alt = "null";
		img.className = "avatar_url";

		const info = document.createElement("div");
		info.className = "friend-info";

		const nameEl = document.createElement("p");
		nameEl.className = "userName";

		// 文字数制限
		if (friend.friend_name.length > 23) {
			const displayName = `${friend.friend_name.substring(0, 23) + "..."}`;
			nameEl.textContent = displayName;
		} else nameEl.textContent = `${friend.friend_name}`;

		const statusEl = document.createElement("p");
		statusEl.className = "status";
		statusEl.textContent = `${friend.online_status}`;

		info.appendChild(nameEl);
		info.appendChild(statusEl);

		card.appendChild(img);
		card.appendChild(info);

		//フレンド詳細画面のイベント
		card.addEventListener("click", () => {
			navigate(`/friend/${friend.id}`);
		});
		root.appendChild(card);
	});
	// フレンドがいなかった時
	if (!friends) {
		const card = document.createElement("div");
		card.textContent = "フレンドがいません";
		root.appendChild(card);
	}
}
