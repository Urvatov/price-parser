import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvironmentVariables(): void {
	const cwdEnvPath = path.resolve(process.cwd(), ".env");
	if (fs.existsSync(cwdEnvPath)) {
		dotenv.config({ path: cwdEnvPath });
		return;
	}

	const rootEnvPath = path.resolve(__dirname, "../../../.env");
	if (fs.existsSync(rootEnvPath)) {
		dotenv.config({ path: rootEnvPath });
		return;
	}

	dotenv.config();
}

loadEnvironmentVariables();

export const config = {
	isProduction: process.env.NODE_ENV === "production",

	server: {
		port: Number(process.env.SERVER_PORT) || 3000,
		host: process.env.SERVER_HOST || "0.0.0.0"
	},

	client: {
		port: Number(process.env.CLIENT_PORT) || 5173
	},

	database: {
		url: process.env.POSTGRES_URL || "",
		name: process.env.POSTGRES_DB || "price_parser",
		user: process.env.POSTGRES_USER || "postgres"
	},

	redis: {
		host: process.env.REDIS_HOST || "127.0.0.1",
		port: Number(process.env.REDIS_PORT) || 6379
	},

	parser: {
		cronPattern: process.env.PARSER_CRON_PATTERN || "0 */4 * * *",
		baseDelayMs: Number(process.env.PARSER_BASE_DELAY_MS) || 3500,
		spreadDelayMs: Number(process.env.PARSER_SPREAD_DELAY_MS) || 1000,
		headless: process.env.PARSER_HEADLESS !== "false",
		profileDirectory: process.env.OZON_PROFILE_DIR || path.resolve(process.cwd(), "profiles/ozon"),
		storageStatePath: process.env.OZON_STORAGE_STATE || path.resolve(process.cwd(), "profiles/ozon_state.json"),
		userAgent: process.env.PARSER_USER_AGENT
			|| "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
	}
} as const;

if (!config.database.url) {
	throw new Error(
		"Критическая ошибка конфигурации: переменная POSTGRES_URL не найдена в файле .env! Пожалуйста, укажите ее в корневом файле .env"
	);
}
