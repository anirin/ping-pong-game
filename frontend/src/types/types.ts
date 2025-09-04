interface ValueObject<T> {
	value: T;
}

export interface RoomUser {
	id: string;
	name: ValueObject<string>; // ← string から ValueObject<string> に変更
	avatar: ValueObject<string> | null; // ← string | null から ValueObject<string> | null に変更
	num_win: number;
	num_lose: number;
}
