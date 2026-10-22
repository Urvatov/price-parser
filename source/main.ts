import "dotenv/config";
import fastify from "fastify";
import { parserRoutes } from "./routes/parserRoutes.js";
import { productsRoutes } from "./routes/productsRoutes.js";

main().catch((error) => {
	console.error("Критическая ошибка:", error);
	process.exit(1);
});

async function main() {
	await setupServer();
}

async function setupServer() {
	const SERVER_PORT = Number(process.env["SERVER_PORT"]);
	if (!SERVER_PORT) {
		throw new Error("server port did not find in .env");
	}

	const server = fastify({
		logger: true
	});

	await server.register(productsRoutes, { prefix: "/api/products" });
	await server.register(parserRoutes, { prefix: "/api/parser" });

	server.listen({ port: SERVER_PORT, host: "0.0.0.0" }, async () => {
		console.log(`server is running: http://localhost:${SERVER_PORT}`);
	});
}
