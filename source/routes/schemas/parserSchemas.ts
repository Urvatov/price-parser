import { FastifySchema } from "fastify";

export const runParserSchema: FastifySchema = {
	tags: ["Parser"],
	summary: "Ручной запуск фонового обновления цен для всех товаров Ozon",
	response: {
		200: {
			type: "object",
			properties: {
				success: { type: "boolean" },
				message: { type: "string" }
			}
		}
	}
};
