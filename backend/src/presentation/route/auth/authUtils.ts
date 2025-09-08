import type { FastifyInstance } from "fastify";

export function decodeJWT(
	fastify: FastifyInstance,
	token: string,
): string | null {
	try {
		const decoded = fastify.jwt.decode(token) as { id: string };
		if (!decoded || !decoded.id) {
			return null;
		}
		return decoded.id;
	} catch (err) {
		console.error("Error decoding JWT:", err);
		return null;
	}
}
