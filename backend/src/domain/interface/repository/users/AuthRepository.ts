export interface PasswordHasher {
	hash(password: string, saltRounds: number): Promise<string>;
	compare(password: string, hash: string): Promise<boolean>;
}

export interface TokenService {
	sign(payload: object, secret: string, options?: object): string;
}

export interface TwoFactorAuthService {
	generateSecret(): string;
	verify(token: string, secret: string): boolean;
	keyuri(email: string, appName: string, secret: string): string;
}

export interface QrCodeGenerator {
	toDataURL(otpauth: string): Promise<string>;
}
