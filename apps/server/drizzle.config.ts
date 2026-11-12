import { config as loadDotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, "../../.env");

if (fs.existsSync(rootEnvPath)) {
	loadDotenv({ path: rootEnvPath });
}
else {
	loadDotenv();
}

export default defineConfig({
	schema: "./source/database/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: { url: process.env["POSTGRES_URL"]! },
	verbose: true,
	strict: true
});
