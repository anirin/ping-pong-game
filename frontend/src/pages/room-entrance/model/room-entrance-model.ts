import {
	apiCreateRoom,
	apiJoinRoom,
	type RoomId,
} from "../api/room-entrance-api";

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export async function createRoom(
	userId: string,
	roomName: string,
): Promise<Result<RoomId>> {
	if (!userId) return { ok: false, error: "ユーザーIDは必須" };
	if (roomName.trim().length < 3)
		return { ok: false, error: "ルーム名は3文字以上" };
	try {
		const res = await apiCreateRoom(userId, roomName);
		return { ok: true, value: res.roomId };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "作成に失敗" };
	}
}

export async function joinRoom(
	userId: string,
	roomId: string,
): Promise<Result<true>> {
	if (!userId) return { ok: false, error: "ユーザーIDは必須" };
	if (!roomId || roomId.trim().length < 6)
		return { ok: false, error: "ルームIDの形式が不正" };
	try {
		await apiJoinRoom(userId, roomId);
		return { ok: true, value: true };
	} catch (e: any) {
		return { ok: false, error: e?.message ?? "参加に失敗" };
	}
}
