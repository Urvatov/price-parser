import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { trackOzonProduct } from "../pipelines/pipelineOzon.js";
import { getLatestPrice, getPriceHistory } from "../services/productPricesService.js";
import { deleteProduct, getProductById, getProducts, updateProduct } from "../services/productsService.js";
import {
	addProductSchema,
	deleteProductSchema,
	getProductByIdSchema,
	getProductHistorySchema,
	getProductsSchema,
	updateProductStatusSchema
} from "./schemas/productsSchemas.js";

interface AddProductBody {
	url: string | number;
}

interface ProductParams {
	id: string;
}

interface UpdateStatusBody {
	isActive: boolean;
}

export async function productsRoutes(server: FastifyInstance): Promise<void> {
	server.get("/", { schema: getProductsSchema }, async (_request: FastifyRequest, reply: FastifyReply) => {
		const products = await getProducts();

		const productsWithLatestPrice = [];
		for (const product of products) {
			const latestPrice = await getLatestPrice(product.id);
			const productItem = {
				...product,
				latestPrice: latestPrice
			};
			productsWithLatestPrice.push(productItem);
		}

		const response = {
			success: true,
			data: productsWithLatestPrice
		};
		return reply.send(response);
	});

	server.post(
		"/",
		{ schema: addProductSchema },
		async (request: FastifyRequest<{ Body: AddProductBody; }>, reply: FastifyReply) => {
			const body = request.body;
			if (!body || body.url === undefined || body.url === null || String(body.url).trim() === "") {
				const badRequestResponse = {
					success: false,
					error: "Поле 'url' обязательно (передайте ссылку или артикул Ozon)"
				};
				return reply.status(400).send(badRequestResponse);
			}

			try {
				const product = await trackOzonProduct(body.url);
				const latestPrice = await getLatestPrice(product.id);

				const successResponse = {
					success: true,
					data: {
						...product,
						latestPrice: latestPrice
					}
				};
				return reply.status(201).send(successResponse);
			}
			catch (error: unknown) {
				let errorMessage = "Ошибка при добавлении товара";
				if (error instanceof Error) {
					errorMessage = error.message;
				}

				const errorResponse = {
					success: false,
					error: errorMessage
				};
				return reply.status(422).send(errorResponse);
			}
		}
	);

	server.get(
		"/:id",
		{ schema: getProductByIdSchema },
		async (request: FastifyRequest<{ Params: ProductParams; }>, reply: FastifyReply) => {
			const { id } = request.params;
			const product = await getProductById(id);

			if (!product) {
				const notFoundResponse = {
					success: false,
					error: "Товар не найден"
				};
				return reply.status(404).send(notFoundResponse);
			}

			const latestPrice = await getLatestPrice(product.id);
			const response = {
				success: true,
				data: {
					...product,
					latestPrice: latestPrice
				}
			};
			return reply.send(response);
		}
	);

	server.get(
		"/:id/history",
		{ schema: getProductHistorySchema },
		async (request: FastifyRequest<{ Params: ProductParams; }>, reply: FastifyReply) => {
			const { id } = request.params;
			const product = await getProductById(id);

			if (!product) {
				const notFoundResponse = {
					success: false,
					error: "Товар не найден"
				};
				return reply.status(404).send(notFoundResponse);
			}

			const history = await getPriceHistory(id);
			const response = {
				success: true,
				data: {
					productId: id,
					history: history
				}
			};
			return reply.send(response);
		}
	);

	server.patch(
		"/:id/status",
		{ schema: updateProductStatusSchema },
		async (request: FastifyRequest<{ Params: ProductParams; Body: UpdateStatusBody; }>, reply: FastifyReply) => {
			const { id } = request.params;
			const body = request.body;

			if (body === undefined || typeof body.isActive !== "boolean") {
				const badRequestResponse = {
					success: false,
					error: "Поле 'isActive' (boolean) обязательно"
				};
				return reply.status(400).send(badRequestResponse);
			}

			const updatedProduct = await updateProduct(id, { isActive: body.isActive });
			if (!updatedProduct) {
				const notFoundResponse = {
					success: false,
					error: "Товар не найден"
				};
				return reply.status(404).send(notFoundResponse);
			}

			const response = {
				success: true,
				data: updatedProduct
			};
			return reply.send(response);
		}
	);

	server.delete(
		"/:id",
		{ schema: deleteProductSchema },
		async (request: FastifyRequest<{ Params: ProductParams; }>, reply: FastifyReply) => {
			const { id } = request.params;
			const deletedProduct = await deleteProduct(id);

			if (!deletedProduct) {
				const notFoundResponse = {
					success: false,
					error: "Товар не найден"
				};
				return reply.status(404).send(notFoundResponse);
			}

			const response = {
				success: true,
				data: deletedProduct
			};
			return reply.send(response);
		}
	);
}
