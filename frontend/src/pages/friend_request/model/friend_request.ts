import { http } from "../api/friend_request.ts";
const VITE_BASE_URL = import.meta.env.VITE_BASE_URL;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type Friend = {
	id: string;
	friend_name: string;
	accept_status: string;
	online_status: string;
	avatar_url: string;
};

export type User = {
	id: string;
	username: string;
	avatar: string;
	status: string;
};

export async function fetchFriendById(id: string): Promise<Result<User>> {
	try {
		const token = localStorage.getItem("accessToken");
		if (!token) {
			return { ok: false, error: "ログインしてください" };
		}
		const res = await http<User>(`${VITE_BASE_URL}/users/${id}`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		return { ok: true, value: res };
	} catch (e) {
		return { ok: false, error: "フレンド取得に失敗" };
	}
}

export async function sendFriendRequest(
	friendId: string,
): Promise<Result<void>> {
	try {
		const token = localStorage.getItem("accessToken");
		if (!token) {
			return { ok: false, error: "ログインしてください" };
		}
		await http<void>(`${VITE_BASE_URL}/friends`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ friendId }),
		});
		return { ok: true, value: undefined };
	} catch (e) {
		return { ok: false, error: "フレンド申請に失敗しました。" };
	}
}
