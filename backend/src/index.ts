import "reflect-metadata";
import dotenv from "dotenv";
import { buildServer } from "@api/server.js";
import { AppDataSource } from "@infrastructure/data-source.js";

// Load environment variables from .env file
dotenv.config();

async function main() {
	try {
		await AppDataSource.initialize();
		console.log("Database initialized");
		const app = await buildServer();
		const port = Number(process.env.PORT ?? 8080);
		await app.listen({ port, host: "0.0.0.0" });
		console.log(`Server running on http://localhost:${port}`);
	} catch (error) {
		console.error("Failed to initialize:", error);
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
