import path from "path";

// scraping
export const USER_AGENT: string =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// proxy todo
export const DISABLE_PROXY: boolean = true;
export const HTTP_PROXY: string | null = null;
export const HTTPS_PROXY: string | null = null;

// timings todo
export const HIGH_PRIORITY_INTERVAL = null;
export const MEDIUM_PRIORITY_INTERVAL = null;
export const LOW_PRIORITY_INTERVAL = null;

export const OZON_PROFILE_DIRECTORY = process.env["OZON_PROFILE_DIR"] || path.resolve("./profiles/ozon");
export const PARSER_BASE_DELAY_MS = Number(process.env["PARSER_BASE_DELAY_MS"]) || 3500;
export const PARSER_SPREAD_DELAY_MS = Number(process.env["PARSER_SPREAD_DELAY_MS"]) || 1000;
