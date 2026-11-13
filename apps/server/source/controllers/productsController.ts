import type {
	AddProductPayload,
	GetProductsQuery,
	Product,
	ProductParams,
	UpdateProductPayload,
	UpdateProductStatusPayload
} from "@price-parser/types";
import { FastifyReply } from "fastify";
import { RequestWithBody, RequestWithParams, RequestWithParamsAndBody, RequestWithQuery } from "../helpers/http.js";
import { extractOzonSku, getNormalizedOzonProductUrl } from "../helpers/normalize.js";
import { parserQueue } from "../queues/parserQueue.js";
import { getLatestPrice, getPriceHistory } from "../services/productPricesService.js";
import {
	createProduct,
	deleteProduct,
	getProductById,
	getProductByUrl,
	getProducts,
	getProductsWithLatestPrice,
	updateProduct
} from "../services/productsService.js";

// roadmap: добавить поиск по маркетплейсу
export async function getProductsHandler(request: RequestWithQuery<GetProductsQuery>, reply: FastifyReply): Promise<void> {
	let productsList;
	if (request.query.price === true) {
		productsList = await getProductsWithLatestPrice();
	}
	else {
		productsList = await getProducts();
	}

	const response = { success: true, data: productsList };

	return reply.send(response);
}

export async function addProductHandler(request: RequestWithBody<AddProductPayload>, reply: FastifyReply): Promise<void> {
	let createdProduct: Product | null = null;

	try {
		const normalizedUrl = getNormalizedOzonProductUrl(request.body.url);
		const existingProduct = await getProductByUrl(normalizedUrl);

		if (existingProduct) {
			if (existingProduct.title === "Загрузка данных...") {
				await parserQueue.add(
					`scrape-product-${existingProduct.id}`,
					{
						type: "SCRAPE_SINGLE_PRODUCT",
						productId: existingProduct.id,
						url: normalizedUrl
					},
					{
						jobId: `scrape-${existingProduct.id}-${Date.now()}`,
						priority: 1
					}
				);

				const reAddedResponse = {
					success: true,
					message: "Товар уже в базе, задача парсинга запущена повторно",
					data: existingProduct
				};
				return reply.send(reAddedResponse);
			}

			const conflictResponse = {
				success: true,
				message: "Товар уже отслеживается",
				data: existingProduct
			};
			return reply.send(conflictResponse);
		}

		const sku = extractOzonSku(normalizedUrl);

		const newProduct = await createProduct({
			marketplace: "OZON",
			url: normalizedUrl,
			sku: sku,
			title: "Загрузка данных...",
			isActive: true
		});
		createdProduct = newProduct;

		await parserQueue.add(
			`scrape-product-${newProduct.id}`,
			{
				type: "SCRAPE_SINGLE_PRODUCT",
				productId: newProduct.id,
				url: normalizedUrl
			},
			{
				jobId: `scrape-${newProduct.id}-${Date.now()}`,
				priority: 1
			}
		);

		const response = {
			success: true,
			message: "Товар поставлен в очередь на обработку",
			data: newProduct
		};

		return reply.status(202).send(response);
	}
	catch (error: unknown) {
		if (createdProduct) {
			await deleteProduct(createdProduct.id).catch(() => {});
		}

		let errorMessage = "Ошибка при добавлении товара";
		if (error instanceof Error) {
			errorMessage = error.message;
		}

		const errorResponse = { success: false, error: errorMessage };
		return reply.status(422).send(errorResponse);
	}
}

export async function refreshProductHandler(request: RequestWithParams<ProductParams>, reply: FastifyReply): Promise<void> {
	const id = request.params.id;
	const product = await getProductById(id);

	if (!product) {
		const notFoundResponse = { success: false, error: "Товар не найден" };
		return reply.status(404).send(notFoundResponse);
	}

	await parserQueue.add(
		`scrape-product-${product.id}`,
		{
			type: "SCRAPE_SINGLE_PRODUCT",
			productId: product.id,
			url: product.url
		},
		{
			jobId: `refresh-${product.id}-${Date.now()}`,
			priority: 1
		}
	);

	const response = {
		success: true,
		message: "Товар отправлен на повторный сбор данных",
		data: product
	};

	return reply.send(response);
}

export async function getProductByIdHandler(request: RequestWithParams<ProductParams>, reply: FastifyReply): Promise<void> {
	const id = request.params.id;
	const product = await getProductById(id);

	if (!product) {
		const notFoundResponse = { success: false, error: "Товар не найден" };
		return reply.status(404).send(notFoundResponse);
	}

	const latestPrice = await getLatestPrice(product.id);
	const response = { success: true, data: { ...product, latestPrice: latestPrice } };
	return reply.send(response);
}

export async function getProductHistoryHandler(request: RequestWithParams<ProductParams>, reply: FastifyReply): Promise<void> {
	const id = request.params.id;
	const product = await getProductById(id);

	if (!product) {
		const notFoundResponse = { success: false, error: "Товар не найден" };
		return reply.status(404).send(notFoundResponse);
	}

	const history = await getPriceHistory(id);
	const response = { success: true, data: { productId: id, history: history } };

	return reply.send(response);
}

export async function updateProductHandler(
	request: RequestWithParamsAndBody<ProductParams, UpdateProductPayload>,
	reply: FastifyReply
): Promise<void> {
	const id = request.params.id;
	const updatedProduct = await updateProduct(id, request.body);

	if (!updatedProduct) {
		const notFoundResponse = { success: false, error: "Товар не найден" };
		return reply.status(404).send(notFoundResponse);
	}

	const response = { success: true, data: updatedProduct };
	return reply.send(response);
}

export async function updateProductStatusHandler(
	request: RequestWithParamsAndBody<ProductParams, UpdateProductStatusPayload>,
	reply: FastifyReply
): Promise<void> {
	const id = request.params.id;
	const updatedProduct = await updateProduct(id, { isActive: request.body.isActive });

	if (!updatedProduct) {
		const notFoundResponse = { success: false, error: "Товар не найден" };
		return reply.status(404).send(notFoundResponse);
	}

	const response = { success: true, data: updatedProduct };
	return reply.send(response);
}

export async function deleteProductHandler(request: RequestWithParams<ProductParams>, reply: FastifyReply): Promise<void> {
	const id = request.params.id;
	const deletedProduct = await deleteProduct(id);

	if (!deletedProduct) {
		const notFoundResponse = { success: false, error: "Товар не найден" };
		return reply.status(404).send(notFoundResponse);
	}

	const response = { success: true, data: deletedProduct };

	return reply.send(response);
}
