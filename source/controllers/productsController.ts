import { FastifyReply } from "fastify";
import { RequestWithBody, RequestWithParams, RequestWithParamsAndBody, RequestWithQuery } from "../library/http.js";
import { trackOzonProduct } from "../pipelines/pipelineOzon.js";
import { getLatestPrice, getPriceHistory } from "../services/productPricesService.js";
import {
	deleteProduct,
	getProductById,
	getProducts,
	getProductsWithLatestPrice,
	updateProduct
} from "../services/productsService.js";

interface GetProductsQuery {
	price?: boolean;
}

interface AddProductBody {
	url: string | number;
}

interface ProductParams {
	id: string;
}

interface UpdateStatusBody {
	isActive: boolean;
}

export async function getProductsHandler(request: RequestWithQuery<GetProductsQuery>, reply: FastifyReply): Promise<void> {
	let productsList;
	if (request.query.price === true) { productsList = await getProductsWithLatestPrice(); }
	else { productsList = await getProducts(); }

	const response = { success: true, data: productsList };

	return reply.send(response);
}

export async function addProductHandler(request: RequestWithBody<AddProductBody>, reply: FastifyReply): Promise<void> {
	try {
		const product = await trackOzonProduct(request.body.url);
		const latestPrice = await getLatestPrice(product.id);

		const successResponse = { success: true, data: { ...product, latestPrice: latestPrice } };
		return reply.status(201).send(successResponse);
	}
	catch (error: unknown) {
		let errorMessage = "Ошибка при добавлении товара";
		if (error instanceof Error) {
			errorMessage = error.message;
		}

		const errorResponse = { success: false, error: errorMessage };
		return reply.status(422).send(errorResponse);
	}
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

export async function updateProductStatusHandler(
	request: RequestWithParamsAndBody<ProductParams, UpdateStatusBody>,
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
