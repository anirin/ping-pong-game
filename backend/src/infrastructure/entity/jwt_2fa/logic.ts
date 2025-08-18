import type {
	PasswordHasher,
	QrCodeGenerator,
	TokenService,
	TwoFactorAuthService,
} from "@domain/interface/repository/users/AuthRepository.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticator } from "otplib";
import qrcode from "qrcode";

export class BcryptPasswordHasher implements PasswordHasher {
	async hash(password: string, saltRounds: number): Promise<string> {
		return bcrypt.hash(password, saltRounds);
	}

	async compare(password: string, hash: string): Promise<boolean> {
		return bcrypt.compare(password, hash);
	}
}

export class JwtTokenService implements TokenService {
	sign(payload: object, secret: string, options?: object): string {
		return jwt.sign(payload, secret, options as jwt.SignOptions);
	}
}

export class OtplibTwoFactorAuthService implements TwoFactorAuthService {
	generateSecret(): string {
		return authenticator.generateSecret();
	}

	verify(token: string, secret: string): boolean {
		return authenticator.verify({ token, secret });
	}

	keyuri(email: string, appName: string, secret: string): string {
		return authenticator.keyuri(email, appName, secret);
	}
}

export class QrCodeService implements QrCodeGenerator {
	async toDataURL(otpauth: string): Promise<string> {
		return qrcode.toDataURL(otpauth);
	}
}
