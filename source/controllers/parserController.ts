import { FastifyReply, FastifyRequest } from "fastify";
import { runOzonUpdatePipeline } from "../pipelines/pipelineOzon.js";

export async function runParserHandler(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
	runOzonUpdatePipeline().catch((error: unknown) => {
		console.error("[Pipeline] Ошибка при фоновом обновлении цен:", error);
	});

	const response = { success: true, message: "Фоновое обновление цен Ozon запущено" };
	return reply.send(response);
}
