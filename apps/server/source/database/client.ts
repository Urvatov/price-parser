import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "../config.js";
import * as schema from "./schema.js";

const db = drizzle(config.database.url, { schema: schema });
export default db;
