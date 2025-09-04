export function isLoggedIn(): boolean {
	const token = localStorage.getItem("accessToken");
	return !!token;
}
