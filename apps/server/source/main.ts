import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastify from "fastify";
import { config } from "./config.js";
import { registerScheduledParserJobs } from "./queues/parserQueue.js";
import { startParserWorker } from "./queues/parserWorker.js";
import { parserRoutes } from "./routes/parserRoutes.js";
import { productsRoutes } from "./routes/productsRoutes.js";

main().catch((error) => {
	console.error("Критическая ошибка:", error);
	process.exit(1);
});

async function main() {
	await setupServer();
	await registerScheduledParserJobs();
	startParserWorker();
}

async function setupServer() {
	const server = fastify({ logger: true });

	await server.register(fastifySwagger, {
		openapi: {
			info: { title: "Price Parser API", description: "API для мониторинга и парсинга цен Ozon", version: "1.0.0" }
		}
	});

	await server.register(fastifySwaggerUi, {
		routePrefix: "/docs",
		uiConfig: {
			docExpansion: "list",
			deepLinking: false
		}
	});

	await server.register(productsRoutes, { prefix: "/api/products" });
	await server.register(parserRoutes, { prefix: "/api/parser" });

	await server.ready();

	await server.listen({ port: config.server.port, host: config.server.host });
	console.log(`server is running: http://localhost:${config.server.port}`);
	console.log(`swagger documentation: http://localhost:${config.server.port}/docs`);
}
