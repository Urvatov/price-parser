import { FastifyInstance } from "fastify";
import { runParserHandler } from "../controllers/parserController.js";
import { runParserSchema } from "./schemas/parserSchemas.js";

export async function parserRoutes(server: FastifyInstance): Promise<void> {
	server.post("/run", { schema: runParserSchema }, runParserHandler);
}
