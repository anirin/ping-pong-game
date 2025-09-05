export async function http<T>(url: string, init: RequestInit): Promise<T> {
	let res: Response;

	const options = {
		...init,
		headers: {
			"Content-Type": "application/json",
			...(init?.headers || {}),
		},
	};
	res = await fetch(url, options);
	if (!res.ok) {
		throw new Error(`error: ${res.status}`);
	}
	const data = await res.json();
	return data as T;
}
