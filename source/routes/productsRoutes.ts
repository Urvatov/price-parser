import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { trackOzonProduct } from "../pipelines/pipelineOzon.js";
import { getLatestProductPrice, getProductPricesHistory } from "../services/productPricesService.js";
import { deleteProduct, getAllProducts, getSpecificProduct, setProductActiveStatus } from "../services/productsService.js";

interface AddProductBody {
	url: string;
}

interface ProductParams {
	id: string;
}

interface UpdateStatusBody {
	isActive: boolean;
}

export async function productsRoutes(server: FastifyInstance): Promise<void> {
	/**
	 * GET /
	 * Возвращает список всех товаров вместе с их последней актуальной ценой.
	 */
	server.get("/", async (_request: FastifyRequest, reply: FastifyReply) => {
		const products = await getAllProducts();

		const productsWithLatestPrice = [];
		for (const product of products) {
			const latestPrice = await getLatestProductPrice(product.id);
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

	/**
	 * POST /
	 * Добавляет товар по ссылке или артикулу Ozon (сразу проводит первичный парсинг).
	 */
	server.post("/", async (request: FastifyRequest<{ Body: AddProductBody }>, reply: FastifyReply) => {
		const body = request.body;
		if (!body || !body.url) {
			const badRequestResponse = {
				success: false,
				error: "Поле 'url' обязательно (передайте ссылку или артикул Ozon)"
			};
			return reply.status(400).send(badRequestResponse);
		}

		try {
			const product = await trackOzonProduct(body.url);
			const latestPrice = await getLatestProductPrice(product.id);

			const successResponse = {
				success: true,
				data: {
					...product,
					latestPrice: latestPrice
				}
			};
			return reply.status(201).send(successResponse);
		} catch (error: unknown) {
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
	});

	/**
	 * GET /:id
	 * Возвращает информацию о конкретном товаре.
	 */
	server.get("/:id", async (request: FastifyRequest<{ Params: ProductParams }>, reply: FastifyReply) => {
		const { id } = request.params;
		const product = await getSpecificProduct(id);

		if (!product) {
			const notFoundResponse = {
				success: false,
				error: "Товар не найден"
			};
			return reply.status(404).send(notFoundResponse);
		}

		const latestPrice = await getLatestProductPrice(product.id);
		const response = {
			success: true,
			data: {
				...product,
				latestPrice: latestPrice
			}
		};
		return reply.send(response);
	});

	/**
	 * GET /:id/history
	 * Возвращает историю изменения цен для товара (для графиков).
	 */
	server.get("/:id/history", async (request: FastifyRequest<{ Params: ProductParams }>, reply: FastifyReply) => {
		const { id } = request.params;
		const product = await getSpecificProduct(id);

		if (!product) {
			const notFoundResponse = {
				success: false,
				error: "Товар не найден"
			};
			return reply.status(404).send(notFoundResponse);
		}

		const history = await getProductPricesHistory(id);
		const response = {
			success: true,
			data: {
				productId: id,
				history: history
			}
		};
		return reply.send(response);
	});

	/**
	 * PATCH /:id/status
	 * Включает или выключает отслеживание товара (isActive: true/false).
	 */
	server.patch(
		"/:id/status",
		async (request: FastifyRequest<{ Params: ProductParams; Body: UpdateStatusBody }>, reply: FastifyReply) => {
			const { id } = request.params;
			const body = request.body;

			if (body === undefined || typeof body.isActive !== "boolean") {
				const badRequestResponse = {
					success: false,
					error: "Поле 'isActive' (boolean) обязательно"
				};
				return reply.status(400).send(badRequestResponse);
			}

			const updatedProduct = await setProductActiveStatus(id, body.isActive);
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

	server.delete("/:id", async (request: FastifyRequest<{ Params: ProductParams }>, reply: FastifyReply) => {
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
	});
}
