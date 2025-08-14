export type RoomId = string

const USE_MOCK = true
const BASE_URL = '/api'

type ApiError = { code: string; message: string }

async function http<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(BASE_URL + path, {
		...init,
		headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
	})
	const data = await res.json().catch(() => ({}))
	if (!res.ok) {
		const err: ApiError = { code: data.code ?? 'HTTP_ERROR', message: data.message ?? 'request failed' }
		throw err
	}
	return data as T
}

function delay<T>(v: T, ms = 400) { return new Promise<T>(r => setTimeout(() => r(v), ms)) }
function randomId(): RoomId {
	return (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

export async function apiCreateRoom(ownerId: string, name: string): Promise<{ roomId: RoomId }> {
	if (USE_MOCK) {
		if (!ownerId || name.trim().length < 3) throw { code: 'VALIDATION', message: 'ownerId必須 / nameは3文字以上' }
		return delay({ roomId: randomId() })
	}
	return http('/rooms', { method: 'POST', body: JSON.stringify({ ownerId, name }) })
}

export async function apiJoinRoom(userId: string, roomId: RoomId): Promise<{ ok: true }> {
	if (USE_MOCK) {
		if (!userId || !roomId) throw { code: 'VALIDATION', message: 'userId / roomId は必須' }
		return delay({ ok: true })
	}
	return http('/rooms/join', { method: 'POST', body: JSON.stringify({ userId, roomId }) })
}
