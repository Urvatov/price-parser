import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const POSTGRES_URL = process.env["POSTGRES_URL"];
if (!POSTGRES_URL) {
	throw new Error("POSTGRES_URL is not found in .env");
}

const db = drizzle(POSTGRES_URL, { schema: schema });
export default db;
