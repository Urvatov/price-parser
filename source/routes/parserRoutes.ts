import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { runOzonUpdatePipeline } from "../pipelines/pipelineOzon.js";

export async function parserRoutes(server: FastifyInstance): Promise<void> {
	/**
	 * POST /run
	 * Ручной триггер запуска фонового обновления цен для всех товаров Ozon.
	 */
	server.post("/run", async (_request: FastifyRequest, reply: FastifyReply) => {
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
