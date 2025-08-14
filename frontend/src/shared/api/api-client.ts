export const apiClient = {
	async get<T>(url: string): Promise<T> {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTPエラー！ステータス: ${response.status}`);
		}
		return response.json() as Promise<T>;
	},
};
