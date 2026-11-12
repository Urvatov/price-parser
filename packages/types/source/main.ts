// Маркетплейсы
export type Marketplace = "OZON" | "WILDBERRIES" | "YANDEX_MARKET" | "AVITO";

// Приоритеты обновления цен
export type Priority = "HIGH" | "MEDIUM" | "LOW";

// Базовая модель товара
export interface Product {
	id: string;
	sku: string;
	marketplace: Marketplace | string;
	title: string;
	url: string;
	image: string | null;
	isActive: boolean;
	priority?: Priority | string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
}

// Запись о цене товара
export interface ProductPrice {
	id: string;
	productId: string;
	price: number | null;
	currency: string | null;
	inStock: boolean;
	createdAt: Date | string;
}

// Товар с последней актуальной ценой
export interface ProductWithLatestPrice extends Product {
	latestPrice: ProductPrice | null;
}

// Псевдонимы типов для обратной совместимости
export type ProductCardData = ProductWithLatestPrice;
export type ProductListItem = ProductWithLatestPrice;
export type ProductDetails = ProductWithLatestPrice;

// DTO для запросов
export interface AddProductPayload {
	url: string | number;
}

export interface UpdateProductPayload {
	title?: string;
	isActive?: boolean;
}

export interface UpdateProductStatusPayload {
	isActive: boolean;
}

export interface GetProductsQuery {
	price?: boolean;
	marketplace?: string;
}

export interface ProductParams {
	id: string;
}

// Данные истории цен товара
export interface ProductHistoryData {
	productId: string;
	history: ProductPrice[];
}

// Общая обертка для ответов API
export interface ApiResponse<T = unknown> {
	success: boolean;
	data: T;
	message?: string;
	error?: string;
}

// Типизированные ответы эндпоинтов
export type GetProductsResponse = ApiResponse<ProductWithLatestPrice[] | Product[]>;
export type GetProductByIdResponse = ApiResponse<ProductWithLatestPrice>;
export type GetProductHistoryResponse = ApiResponse<ProductHistoryData>;
export type AddProductResponse = ApiResponse<Product>;
export type UpdateProductResponse = ApiResponse<Product>;
export type UpdateProductStatusResponse = ApiResponse<Product>;
export type DeleteProductResponse = ApiResponse<Product>;
export type RunParserResponse = ApiResponse<undefined>;
