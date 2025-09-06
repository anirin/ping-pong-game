import { http } from "../api/profile.ts";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type MatchResult = {
	all_count: string;
	win_count: string;
};

export type User = {
	id: string;
	player1Id: string;
	player2Id: string;
	score1: number;
	score2: number;
	status: string;
	winnerId: string | null;
	opponentId: string;
	opponentName: string;
	opponentAvatarUrl: string;
};

export async function fetchUsers(token: string): Promise<Result<User[]>> {
	try {
		const res: User[] = await http<User[]>("https://localhost:8080/match", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		return { ok: true, value: res };
	} catch (e) {
		return { ok: false, error: "マッチ履歴取得失敗" };
	}
}
