import { apiClient } from "@api/api-client";

export async function fetchHomeData(): Promise<{ message: string }> {
	try {
		const response = await apiClient.get<{ message: string }>("/api/home");
		return response;
	} catch (error) {
		console.error("ホームデータの取得に失敗しました:", error);
		return { message: "データの読み込みに失敗しました" };
	}
}
