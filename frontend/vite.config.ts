import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
	root: path.resolve(__dirname, "src"),
	plugins: [],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			"@app": path.resolve(__dirname, "src/app"),
			"@pages": path.resolve(__dirname, "src/pages"),
			"@widgets": path.resolve(__dirname, "src/widgets"),
			"@shared": path.resolve(__dirname, "src/shared"),
		},
	},
	server: {},
	build: {
		rollupOptions: {
			input: path.resolve(__dirname, "src/index.html"),
		},
	},
});
