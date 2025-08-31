import { http } from "../api/friend_list.ts";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type Friend = {
	id: string;
	friend_name: string;
	accept_status: string;
	online_status: string;
	avatar_url: string;
};

export async function fetchFriends(): Promise<Result<Friend[]>> {
	try {
		const token = localStorage.getItem("accessToken");
		if (!token) {
			return { ok: false, error: "ログインしてください" };
		}
		const res: Friend[] = await http<Friend[]>(
			"https://localhost:8080/friends",
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);
		return { ok: true, value: res };
	} catch (e) {
		console.error("Friends Error: ", e);
		return { ok: false, error: "フレンド取得に失敗" };
	}
}
