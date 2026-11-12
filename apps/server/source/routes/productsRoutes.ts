import { FastifyInstance } from "fastify";

import {
	addProductHandler,
	deleteProductHandler,
	getProductByIdHandler,
	getProductHistoryHandler,
	getProductsHandler,
	updateProductHandler,
	updateProductStatusHandler
} from "../controllers/productsController.js";

import {
	addProductSchema,
	deleteProductSchema,
	getProductByIdSchema,
	getProductHistorySchema,
	getProductsSchema,
	updateProductSchema,
	updateProductStatusSchema
} from "./schemas/productsSchemas.js";

export async function productsRoutes(server: FastifyInstance): Promise<void> {
	server.get("/", { schema: getProductsSchema }, getProductsHandler);
	server.post("/", { schema: addProductSchema }, addProductHandler);
	server.get("/:id", { schema: getProductByIdSchema }, getProductByIdHandler);
	server.get("/:id/history", { schema: getProductHistorySchema }, getProductHistoryHandler);
	server.patch("/:id", { schema: updateProductSchema }, updateProductHandler);
	server.patch("/:id/status", { schema: updateProductStatusSchema }, updateProductStatusHandler);
	server.delete("/:id", { schema: deleteProductSchema }, deleteProductHandler);
}
