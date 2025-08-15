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
			"@shared": path.resolve(__dirname, "src/shared"),
			"@api": path.resolve(__dirname, "src/shared/api"),
			"@ui": path.resolve(__dirname, "src/shared/ui"),
			"@lib": path.resolve(__dirname, "src/shared/lib"),
			"@utils": path.resolve(__dirname, "src/shared/lib"),
			"@types": path.resolve(__dirname, "src/shared/types"),
			"@components": path.resolve(__dirname, "src/shared/components"),
			"@widgets": path.resolve(__dirname, "src/widgets"),
		},
	},
	server: {},
	build: {
		rollupOptions: {
			input: path.resolve(__dirname, "src/index.html"),
		},
	},
});
