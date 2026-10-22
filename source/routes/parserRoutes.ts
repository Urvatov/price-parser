import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { runOzonUpdatePipeline } from "../pipelines/pipelineOzon.js";
import { runParserSchema } from "./schemas/parserSchemas.js";

export async function parserRoutes(server: FastifyInstance): Promise<void> {
	server.post("/run", { schema: runParserSchema }, async (_request: FastifyRequest, reply: FastifyReply) => {
		runOzonUpdatePipeline().catch((error: unknown) => {
			console.error("[Pipeline] Ошибка при фоновом обновлении цен:", error);
		});

		const response = {
			success: true,
			message: "Фоновое обновление цен Ozon запущено"
		};
		return reply.send(response);
	});
}
