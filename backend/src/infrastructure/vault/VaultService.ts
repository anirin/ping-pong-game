import vault from "node-vault";

export class VaultService {
	private client: any;

	constructor() {
		this.client = vault({
			apiVersion: "v1",
			endpoint: process.env.VAULT_ADDR || "http://localhost:8201",
			token: process.env.VAULT_TOKEN || "myroot",
		});
	}

	async getJwtSecret(): Promise<string> {
		try {
			const result = await this.client.read("secret/data/jwt");
			return result.data.data.secret;
		} catch (error) {
			console.error("Failed to get JWT secret from Vault:", error);
			// フォールバックとして環境変数を使用
			return process.env.JWT_SECRET || "fallback_secret";
		}
	}

	async getPort(): Promise<string> {
		try {
			const result = await this.client.read("secret/data/app");
			return result.data.data.port;
		} catch (error) {
			console.error("Failed to get port from Vault:", error);
			// フォールバックとしてデフォルトポートを使用
			return "8080";
		}
	}
}
