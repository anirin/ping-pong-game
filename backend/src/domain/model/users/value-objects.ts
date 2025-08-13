export class Username {
	constructor(public readonly value: string) {
		if (!/^[a-zA-Z0-9_]{3,30}$/.test(value)) throw new Error('invalid username')
		if (/^admin|root$/i.test(value)) throw new Error('reserved username')
	}
}

export class AvatarUrl {
	constructor(public readonly value: string) {
		try { new URL(value) } catch { throw new Error('invalid url') }
	}
}

export type UserStatus = 'offline' | 'online' | 'busy' | 'away'
export type UserId = string