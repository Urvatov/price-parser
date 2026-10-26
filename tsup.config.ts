import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["source/main.ts"],
	outDir: "build",
	format: ["esm"],
	target: "node20",
	clean: true,
	minify: true,
	sourcemap: true,
	splitting: false,
	dts: false
});
