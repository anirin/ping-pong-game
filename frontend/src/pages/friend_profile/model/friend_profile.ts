import { http } from "../api/friend_profile.ts";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type Friend = {
	id: string;
	friend_name: string;
	accept_status: string;
	online_status: string;
	avatar_url: string;
};

export async function fetchFriendProfile(id: string): Promise<Result<Friend>> {
	try {
		const token = localStorage.getItem("accessToken");
		if (!token) {
			return { ok: false, error: "ログインしてください" };
		}
		const res: Friend = await http<Friend>(
			`https://localhost:8080/friend/${id}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);
		return { ok: true, value: res };
	} catch (e) {
		return { ok: false, error: "フレンド取得に失敗" };
	}
}

export async function acceptFriend(id: string): Promise<Result<void>> {
	try {
		const token = localStorage.getItem("accessToken");
		if (!token) {
			return { ok: false, error: "ログインしてください" };
		}
		await http<Friend>(`https://localhost:8080/friend/${id}`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		return { ok: true, value: undefined };
	} catch (e) {
		return { ok: false, error: "承認に失敗しました" };
	}
}

export async function deleteFriend(id: string): Promise<Result<void>> {
	try {
		const token = localStorage.getItem("accessToken");
		if (!token) {
			return { ok: false, error: "ログインしてください" };
		}
		await http<Friend>(`https://localhost:8080/friend/${id}`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		return { ok: true, value: undefined };
	} catch (e) {
		return { ok: false, error: "削除に失敗しました" };
	}
}
