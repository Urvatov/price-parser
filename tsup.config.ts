import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["source/main.ts"],
	outDir: "build",
	format: ["esm"],
	platform: "node",
	target: "node26",
	sourcemap: true,
	clean: true
});
