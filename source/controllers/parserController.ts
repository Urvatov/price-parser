import { FastifyReply, FastifyRequest } from "fastify";
import { parserQueue } from "../queues/parserQueue.js";

export async function runParserHandler(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
	await parserQueue.add("manual-ozon-update", {
		type: "SCHEDULED_UPDATE_PIPELINE",
		marketplace: "OZON"
	});

	const response = { success: true, message: "Фоновое обновление цен Ozon добавлено в очередь" };
	return reply.send(response);
}
