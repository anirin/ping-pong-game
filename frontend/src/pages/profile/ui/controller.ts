import { fetchUsers } from "../model/profile";

// JWTトークンをデコードする関数
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

export async function mountProfile(root: HTMLElement) {
	const token = localStorage.getItem("accessToken");
	if (!token) {
		const messageEl = document.createElement("p");
		messageEl.textContent = "ログインされていません。";
		messageEl.style.color = "#888";
		messageEl.style.textAlign = "center";
		root.appendChild(messageEl);
		return;
	}
	const res = await fetchUsers(token);

	if (res.ok === false) {
		const messageEl = document.createElement("p");
		messageEl.textContent = "ログインされていません。";
		messageEl.style.color = "#888";
		messageEl.style.textAlign = "center";
		root.appendChild(messageEl);
		return;
	}

	const decoded = decodeJwt(token);
	const userId = decoded?.id || decoded?.sub;
	if (!userId) {
		const messageEl = document.createElement("p");
		messageEl.textContent =
			"ユーザー情報の読み取りに失敗しました。再度ログインしてください。";
		messageEl.style.color = "#888";
		messageEl.style.textAlign = "center";
		root.appendChild(messageEl);
		return;
	}

	const matches = res.value;

	if (!matches) {
		const card = document.createElement("div");
		card.textContent = "履歴がありません";
		root.appendChild(card);
		return;
	}

	const total = matches.length;
	const wins = matches.filter((m) => m.winnerId === userId).length;
	const loss = matches.filter(
		(m) => m.winnerId && m.winnerId !== userId,
	).length;
	const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

	const summary = document.createElement("div");
	summary.className = "match-summary";
	summary.innerHTML = `
		<div class="summary-title">あなたの戦績</div>
		<div class="summary-stats">
			<span class="summary-detail win">勝ち ${wins}</span>
			<span class="summary-detail loss">負け ${loss}</span>
			<span class="summary-detail total">全試合 ${total}</span>
			<span class="summary-detail rate">勝率 ${winRate}</span>
		</div>
	`;
	root.appendChild(summary);

	if (total === 0) {
		const card = document.createElement("div");
		card.textContent = "履歴がありません";
		root.appendChild(card);
		return;
	}
	matches.forEach((match) => {
		const card = document.createElement("div");
		card.className = "user-profile";

		const img = document.createElement("img");
		img.src = match.opponentAvatarUrl;
		img.alt = "User Avatar";
		img.className = "avatar_url";

		const youAreP1 = match.player1Id === userId;
		const yourScore = youAreP1 ? match.score1 : match.score2;
		const oppScore = youAreP1 ? match.score2 : match.score1;

		let result = "loss";
		if (match.winnerId === userId) result = "win";

		const dateText = (() => {
			if (!match.game_date) return "";
			const d = new Date(match.game_date);

			return d.toLocaleString("ja-JP", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			});
		})();

		const info = document.createElement("div");
		info.className = "user-info";

		const nameEl = document.createElement("p");
		nameEl.className = "userName";

		// 文字数制限
		if (match.opponentName.length > 23) {
			const displayName = `${match.opponentName.substring(0, 23) + "..."}`;
			nameEl.textContent = displayName;
		} else nameEl.textContent = `${match.opponentName}`;

		const dateEl = document.createElement("p");
		dateEl.className = "match-date";
		dateEl.textContent = dateText;

		const resultEl = document.createElement("span");
		resultEl.className = `match-result ${result}`;
		if (result === "win") result = "勝ち";
		else result = "負け";
		resultEl.textContent = result;

		const scoreEl = document.createElement("p");
		scoreEl.className = "match-score";
		scoreEl.textContent = `${yourScore} - ${oppScore}`;
		info.appendChild(nameEl);
		if (dateText) info.appendChild(dateEl);
		info.append(resultEl);
		info.appendChild(scoreEl);

		card.appendChild(img);
		card.appendChild(info);
		root.appendChild(card);
	});
}
