import "dotenv/config";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastify from "fastify";
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
    const SERVER_PORT = Number(process.env["SERVER_PORT"]);
    if (!SERVER_PORT) {
        throw new Error("server port did not find in .env");
    }

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

    server.listen({ port: SERVER_PORT, host: "0.0.0.0" }, async () => {
        console.log(`server is running: http://localhost:${SERVER_PORT}`);
        console.log(`swagger documentation: http://localhost:${SERVER_PORT}/docs`);
    });
}
