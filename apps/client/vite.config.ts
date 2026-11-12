import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
	const rootDir = path.resolve(__dirname, "../../");
	const env = loadEnv(mode, rootDir, "");

	const clientPort = Number(env.CLIENT_PORT) || 5173;
	const serverPort = Number(env.SERVER_PORT) || 3000;

	return {
		plugins: [svelte()],
		envDir: rootDir,
		build: {
			outDir: "build"
		},
		server: {
			port: clientPort,
			proxy: {
				"/api": {
					target: `http://localhost:${serverPort}`,
					changeOrigin: true
				}
			}
		}
	};
});
