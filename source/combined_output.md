# Файл: parserController.ts
**Путь:** `controllers\parserController.ts`

```typescript
import { FastifyReply, FastifyRequest } from "fastify";
import { runOzonUpdatePipeline } from "../pipelines/pipelineOzon.js";

export async function runParserHandler(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
	runOzonUpdatePipeline().catch((error: unknown) => {
		console.error("[Pipeline] Ошибка при фоновом обновлении цен:", error);
	});

	const response = { success: true, message: "Фоновое обновление цен Ozon запущено" };
	return reply.send(response);
}

```

---

# Файл: productsController.ts
**Путь:** `controllers\productsController.ts`

```typescript
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
	marketplace?: string;
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

```

---

# Файл: client.ts
**Путь:** `database\client.ts`

```typescript
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
	throw new Error("DATABASE_URL is not found in .env");
}

const db = drizzle(DATABASE_URL, { schema: schema });
export default db;

```

---

# Файл: schema.ts
**Путь:** `database\schema.ts`

```typescript
import { boolean, integer, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const marketplaceEnum = pgEnum("marketplace_enum", ["OZON", "WILDBERRIES", "YANDEX_MARKET", "AVITO"]);

export const productsTable = pgTable("products", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	sku: varchar("sku", { length: 64 }).notNull(),
	marketplace: marketplaceEnum("marketplace").notNull(),
	title: varchar("title").notNull(),
	url: varchar("url").notNull().unique(),
	image: varchar("image"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const productPricesTable = pgTable("product_prices", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").references(() => productsTable.id, { onDelete: "cascade" }).notNull(),
	price: integer("price").notNull(),
	currency: varchar("currency", { length: 3 }).default("RUB").notNull(),
	inStock: boolean("is_in_stock").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

```

---

# Файл: types.ts
**Путь:** `database\types.ts`

```typescript
import { type productPricesTable, type productsTable } from "./schema.js";

export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type ProductPrice = typeof productPricesTable.$inferSelect;
export type NewProductPrice = typeof productPricesTable.$inferInsert;

```

---

# Файл: arrays.ts
**Путь:** `library\arrays.ts`

```typescript
export function shuffle<T>(array: readonly T[]): T[] {
	const result = [...array];

	for (let currentIndex = result.length - 1; currentIndex > 0; currentIndex--) {
		const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
		[result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]];
	}

	return result;
}

```

---

# Файл: http.ts
**Путь:** `library\http.ts`

```typescript
import { FastifyRequest } from "fastify";

export type RequestWithBody<T> = FastifyRequest<{ Body: T; }>;
export type RequestWithParams<T> = FastifyRequest<{ Params: T; }>;
export type RequestWithQuery<T> = FastifyRequest<{ Querystring: T; }>;
export type RequestWithParamsAndBody<P, B> = FastifyRequest<{ Params: P; Body: B; }>;

```

---

# Файл: normalize.ts
**Путь:** `library\normalize.ts`

```typescript
export function getNormalizedOzonProductUrl(input: string | number): string {
	const sku = extractOzonSku(input);
	const normalizedUrl = `https://www.ozon.ru/product/${sku}/`;
	return normalizedUrl;
}

export function extractOzonSku(input: string | number): string {
	const raw = String(input);
	const trimmed = raw.trim();

	// 1. Чистый артикул: "123456789" или число 123456789
	if (/^\d+$/.test(trimmed)) {
		return trimmed;
	}

	// 2. Формат: /product/slug-123456789/ или /product/123456789/
	const productUrlMatch = trimmed.match(/\/product\/(?:[^/?#]+-)?(\d+)(?:[/?#]|$)/);
	if (productUrlMatch && productUrlMatch[1]) {
		const sku = productUrlMatch[1];
		return sku;
	}

	// 3. Старый формат Ozon: /context/detail/id/123456789/
	const legacyUrlMatch = trimmed.match(/\/context\/detail\/id\/(\d+)(?:[/?#]|$)/);
	if (legacyUrlMatch && legacyUrlMatch[1]) {
		const sku = legacyUrlMatch[1];
		return sku;
	}

	// 4. Поиск параметра ?sku=123456789 или ?id=123456789
	const queryMatch = trimmed.match(/[?&](?:sku|id)=(\d+)(?:[&#]|$)/);
	if (queryMatch && queryMatch[1]) {
		const sku = queryMatch[1];
		return sku;
	}

	throw new Error(`Не удалось извлечь артикул Ozon из переданного значения: "${input}"`);
}

```

---

# Файл: time.ts
**Путь:** `library\time.ts`

```typescript
export function delay(ms: number): Promise<void> {
	const promise = new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
	return promise;
}

export function delayRandom(ms: number, spread: number = 500): Promise<void> {
	const min = Math.max(0, ms - spread);
	const max = ms + spread;
	const randomMs = Math.floor(Math.random() * (max - min + 1)) + min;
	const promise = delay(randomMs);
	return promise;
}

```

---

# Файл: main.ts
**Путь:** `main.ts`

```typescript
import "dotenv/config";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastify from "fastify";
import { parserRoutes } from "./routes/parserRoutes.js";
import { productsRoutes } from "./routes/productsRoutes.js";
import { setupScheduler } from "./services/schedulerService.js";

main().catch((error) => {
	console.error("Критическая ошибка:", error);
	process.exit(1);
});

async function main() {
	await setupServer();
	setupScheduler();
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

	await server.register(fastifySwaggerUi, { routePrefix: "/docs", uiConfig: { docExpansion: "list", deepLinking: false } });

	await server.register(productsRoutes, { prefix: "/api/products" });
	await server.register(parserRoutes, { prefix: "/api/parser" });

	await server.ready();

	server.listen({ port: SERVER_PORT, host: "0.0.0.0" }, async () => {
		console.log(`server is running: http://localhost:${SERVER_PORT}`);
		console.log(`swagger documentation: http://localhost:${SERVER_PORT}/docs`);
	});
}

```

---

# Файл: parserOzon.ts
**Путь:** `parsers\parserOzon.ts`

```typescript
import fs from "fs";
import path from "path";
import { BrowserContext, chromium, Page } from "playwright";
import { USER_AGENT } from "../../config.js";
import { extractOzonSku } from "../library/normalize.js";

const PROFILE_DIRECTORY = path.resolve("./profiles/ozon");

export interface OzonParsedData {
	sku: string | null;
	title: string | null;
	price: number | null;
	image: string | null;
	inStock: boolean;
}

export async function createOzonSession(): Promise<{ context: BrowserContext; page: Page; }> {
	const hasProfile = fs.existsSync(PROFILE_DIRECTORY);
	let isHeadless = false;
	if (hasProfile) {
		isHeadless = true;
	}

	if (isHeadless) {
		console.log("[Ozon] Запуск браузера в фоновом режиме...");
	}
	else {
		console.log("[Ozon] Профиль не найден. Открываем окно для ручной авторизации...");
	}

	const args: string[] = [
		"--disable-blink-features=AutomationControlled",
		"--no-sandbox",
		"--proxy-server=direct://",
		"--proxy-bypass-list=*"
	];

	const context = await chromium.launchPersistentContext(PROFILE_DIRECTORY, {
		headless: isHeadless,
		viewport: { width: 1280, height: 720 },
		userAgent: USER_AGENT,
		args: args
	});

	let page: Page;
	if (context.pages().length > 0) {
		page = context.pages()[0];
	}
	else {
		page = await context.newPage();
	}

	if (!hasProfile) {
		console.log("Войди в аккаунт Ozon (ожидание 60 сек)...");
		await new Promise((resolve) => setTimeout(resolve, 60000));
		console.log("Профиль сохранен.");
	}

	const session = { context, page };
	return session;
}

export async function parseOzonProduct(page: Page, url: string): Promise<OzonParsedData> {
	let sku: string | null = null;
	try {
		sku = extractOzonSku(url);
	}
	catch {
		sku = null;
	}

	try {
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

		if (!sku) {
			sku = await parseSkuFromPage(page);
		}

		const [inStock, title, image] = await Promise.all([parseInStock(page), parseTitle(page), parseImage(page)]);
		const price = await parsePrice(page, inStock);

		const result: OzonParsedData = { sku, title, price, image, inStock };

		return result;
	}
	catch (error: unknown) {
		if (error instanceof Error) {
			console.error(`[Ozon] Ошибка при парсинге ${url}:`, error.message);
		}

		const fallbackResult: OzonParsedData = { sku: sku, title: null, price: null, image: null, inStock: false };

		return fallbackResult;
	}
}

async function parseInStock(page: Page): Promise<boolean> {
	let inStockResult = false;

	try {
		const outOfStockMarkers = [
			"Этот товар закончился",
			"Товар закончился",
			"Нет в наличии",
			"Товар не доставляется в ваш регион",
			"Узнать о поступлении"
		];

		const selector = outOfStockMarkers.map((text) => `text="${text}"`).join(", ");
		const isOutOfStock = await page.locator(selector).first().isVisible();

		if (isOutOfStock) {
			inStockResult = false;
			return inStockResult;
		}

		const isBuyButtonVisible = await page
			.locator('button:has-text("В корзину"), button:has-text("Купить в 1 клик"), button:has-text("Купить")')
			.first()
			.isVisible();

		if (isBuyButtonVisible) {
			inStockResult = true;
			return inStockResult;
		}

		const isPriceWidgetVisible = await page.locator('[data-widget="webPrice"]').isVisible();
		if (isPriceWidgetVisible) {
			inStockResult = true;
			return inStockResult;
		}

		inStockResult = false;
		return inStockResult;
	}
	catch {
		inStockResult = false;
		return inStockResult;
	}
}

async function parsePrice(page: Page, inStock: boolean): Promise<number | null> {
	let priceResult: number | null = null;

	if (!inStock) {
		return priceResult;
	}

	try {
		const priceWidget = page.locator('[data-widget="webPrice"]');
		await priceWidget.waitFor({ state: "visible", timeout: 10000 });

		const priceElements = await priceWidget.locator('span:has-text("₽")').allInnerTexts();

		const prices: number[] = priceElements.map((text) => Number(text.replace(/[^\d]/g, ""))).filter((val) =>
			!Number.isNaN(val) && val > 0
		);

		if (prices.length > 0) {
			priceResult = Math.min(...prices);
			return priceResult;
		}

		return priceResult;
	}
	catch (error: unknown) {
		console.warn("[Ozon] Не удалось найти цену на странице");
		return priceResult;
	}
}

async function parseSkuFromPage(page: Page): Promise<string | null> {
	let skuResult: string | null = null;

	try {
		const skuLocator = page.locator("text=/Артикул:\\s*\\d+/").first();
		const skuCount = await skuLocator.count();

		if (skuCount > 0) {
			const skuRawText = await skuLocator.textContent();
			if (skuRawText) {
				const skuDigits = skuRawText.replace(/[^\d]/g, "");
				if (skuDigits !== "") {
					skuResult = skuDigits;
					return skuResult;
				}
			}
		}

		return skuResult;
	}
	catch {
		return skuResult;
	}
}

async function parseTitle(page: Page): Promise<string | null> {
	let titleResult: string | null = null;

	try {
		const h1Locator = page.locator("h1").first();
		const h1Count = await h1Locator.count();

		if (h1Count > 0) {
			const rawH1 = await h1Locator.textContent();
			if (rawH1) {
				const trimmedH1 = rawH1.trim();
				if (trimmedH1 !== "") {
					titleResult = trimmedH1;
					return titleResult;
				}
			}
		}

		const ogTitleLocator = page.locator('meta[property="og:title"]').first();
		const ogTitleCount = await ogTitleLocator.count();

		if (ogTitleCount > 0) {
			const rawOgTitle = await ogTitleLocator.getAttribute("content");
			if (rawOgTitle) {
				const trimmedOgTitle = rawOgTitle.trim();
				if (trimmedOgTitle !== "") {
					titleResult = trimmedOgTitle;
					return titleResult;
				}
			}
		}

		return titleResult;
	}
	catch {
		return titleResult;
	}
}

async function parseImage(page: Page): Promise<string | null> {
	let imageResult: string | null = null;

	try {
		const ogImageLocator = page.locator('meta[property="og:image"]').first();
		const ogImageCount = await ogImageLocator.count();

		if (ogImageCount > 0) {
			const ogImageSrc = await ogImageLocator.getAttribute("content");
			if (ogImageSrc) {
				imageResult = ogImageSrc;
				return imageResult;
			}
		}

		const galleryImageLocator = page.locator('[data-widget="webGallery"] img').first();
		const galleryCount = await galleryImageLocator.count();

		if (galleryCount > 0) {
			const gallerySrc = await galleryImageLocator.getAttribute("src");
			if (gallerySrc) {
				imageResult = gallerySrc;
				return imageResult;
			}
		}

		return imageResult;
	}
	catch {
		return imageResult;
	}
}

```

---

# Файл: pipelineOzon.ts
**Путь:** `pipelines\pipelineOzon.ts`

```typescript
import "dotenv/config";
import { shuffle } from "../library/arrays.js";
import { getNormalizedOzonProductUrl } from "../library/normalize.js";
import { delayRandom } from "../library/time.js";
import { createOzonSession, parseOzonProduct } from "../parsers/parserOzon.js";
import { createPrice } from "../services/productPricesService.js";
import { createProduct, getProductByUrl, getProductsByMarketplace, updateProduct } from "../services/productsService.js";

export async function trackOzonProduct(rawInput: string | number) {
	const normalizedUrl = getNormalizedOzonProductUrl(rawInput);
	const existingProduct = await getProductByUrl(normalizedUrl);

	if (existingProduct) {
		console.log(`[Ozon] Товар уже отслеживается: "${existingProduct.title}"`);
		return existingProduct;
	}

	const { context, page } = await createOzonSession();

	try {
		console.log(`[Ozon] Загрузка нового товара: ${normalizedUrl}`);
		const parsedData = await parseOzonProduct(page, normalizedUrl);

		if (!parsedData.title) {
			throw new Error(`Не удалось загрузить карточку Ozon по адресу: ${normalizedUrl}`);
		}

		if (!parsedData.sku) {
			throw new Error(`Не удалось определить артикул товара: ${normalizedUrl}`);
		}

		const createdProduct = await createProduct({
			marketplace: "OZON",
			url: normalizedUrl,
			sku: parsedData.sku,
			title: parsedData.title,
			image: parsedData.image,
			isActive: true
		});

		console.log(`[Ozon] Товар успешно добавлен: "${createdProduct.title}" (Артикул: ${createdProduct.sku})`);

		let initialPrice = 0;
		if (parsedData.price !== null) {
			initialPrice = parsedData.price;
		}

		await createPrice({ productId: createdProduct.id, price: initialPrice, inStock: parsedData.inStock });

		console.log(`[Ozon] Первая цена зафиксирована: ${initialPrice} ₽ (В наличии: ${parsedData.inStock})`);

		return createdProduct;
	}
	finally {
		await context.close();
	}
}

export async function runOzonUpdatePipeline() {
	const ozonProducts = await getProductsByMarketplace("OZON");
	const products = shuffle(ozonProducts);

	console.log(`Найдено товаров для парсинга: ${products.length}`);

	if (products.length === 0) {
		console.log("Нет товаров в очереди.");
		return;
	}

	const { context, page } = await createOzonSession();

	try {
		for (let i = 0; i < products.length; i++) {
			const product = products[i];
			console.log(`\n[${i + 1}/${products.length}] "${product.title}"`);

			const parsedData = await parseOzonProduct(page, product.url);

			let needUpdate = false;
			const updatePayload: { sku?: string; image?: string; } = {};

			if (parsedData.sku !== null && !product.sku) {
				updatePayload.sku = parsedData.sku;
				needUpdate = true;
			}

			if (parsedData.image !== null && !product.image) {
				updatePayload.image = parsedData.image;
				needUpdate = true;
			}

			if (needUpdate) {
				await updateProduct(product.id, updatePayload);
				console.log(`\t- Метаданные обновлены (Артикул: ${parsedData.sku})`);
			}

			if (parsedData.inStock && parsedData.price !== null) {
				console.log(`\tВ наличии: ДА`);
				console.log(`\tЦена: ${parsedData.price} ₽`);

				await createPrice({ productId: product.id, price: parsedData.price, inStock: true });
				console.log(`\t- Записано в базу данных`);
			}
			else {
				console.log(`\tВ наличии: НЕТ (товар закончился или снят с продажи)`);

				await createPrice({ productId: product.id, price: 0, inStock: false });
				console.log(`\t- Статус отсутствия записан в базу данных`);
			}

			if (i < products.length - 1) {
				console.log("\tПауза между запросами...");
				await delayRandom(3500, 1000);
			}
		}
	}
	finally {
		await context.close();
		console.log("\nВсе задачи выполнены, браузер закрыт.");
	}
}

```

---

# Файл: parserRoutes.ts
**Путь:** `routes\parserRoutes.ts`

```typescript
import { FastifyInstance } from "fastify";
import { runParserHandler } from "../controllers/parserController.js";
import { runParserSchema } from "./schemas/parserSchemas.js";

export async function parserRoutes(server: FastifyInstance): Promise<void> {
	server.post("/run", { schema: runParserSchema }, runParserHandler);
}

```

---

# Файл: productsRoutes.ts
**Путь:** `routes\productsRoutes.ts`

```typescript
import { FastifyInstance } from "fastify";
import {
	addProductHandler,
	deleteProductHandler,
	getProductByIdHandler,
	getProductHistoryHandler,
	getProductsHandler,
	updateProductStatusHandler
} from "../controllers/productsController.js";
import {
	addProductSchema,
	deleteProductSchema,
	getProductByIdSchema,
	getProductHistorySchema,
	getProductsSchema,
	updateProductStatusSchema
} from "./schemas/productsSchemas.js";

export async function productsRoutes(server: FastifyInstance): Promise<void> {
	server.get("/", { schema: getProductsSchema }, getProductsHandler);
	server.post("/", { schema: addProductSchema }, addProductHandler);
	server.get("/:id", { schema: getProductByIdSchema }, getProductByIdHandler);
	server.get("/:id/history", { schema: getProductHistorySchema }, getProductHistoryHandler);
	server.patch("/:id/status", { schema: updateProductStatusSchema }, updateProductStatusHandler);
	server.delete("/:id", { schema: deleteProductSchema }, deleteProductHandler);
}

```

---

# Файл: parserSchemas.ts
**Путь:** `routes\schemas\parserSchemas.ts`

```typescript
import { FastifySchema } from "fastify";

export const runParserSchema: FastifySchema = {
	tags: ["Parser"],
	summary: "Ручной запуск фонового обновления цен для всех товаров Ozon",
	response: { 200: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" } } } }
};

```

---

# Файл: productsSchemas.ts
**Путь:** `routes\schemas\productsSchemas.ts`

```typescript
import { FastifySchema } from "fastify";

export const getProductsSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Список всех товаров (с возможностью запросить последнюю цену)",
	querystring: {
		type: "object",
		properties: {
			price: { type: "boolean", default: false, description: "Прикреплять ли последнюю актуальную цену к товарам" }
		}
	},
	response: {
		200: {
			type: "object",
			properties: {
				success: { type: "boolean" },
				data: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							sku: { type: "string" },
							marketplace: { type: "string" },
							title: { type: "string" },
							url: { type: "string" },
							image: { type: "string", nullable: true },
							isActive: { type: "boolean" },
							createdAt: { type: "string" },
							updatedAt: { type: "string" },
							latestPrice: {
								type: "object",
								nullable: true,
								properties: {
									id: { type: "string" },
									productId: { type: "string" },
									price: { type: "integer" },
									currency: { type: "string" },
									inStock: { type: "boolean" },
									createdAt: { type: "string" }
								}
							}
						}
					}
				}
			}
		}
	}
};

export const addProductSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Добавить товар по ссылке или артикулу Ozon",
	body: {
		type: "object",
		required: ["url"],
		properties: {
			url: { type: ["string", "number"], description: "Ссылка на страницу товара Ozon или числовой артикул (SKU)" }
		}
	},
	response: {
		201: {
			type: "object",
			properties: {
				success: { type: "boolean" },
				data: {
					type: "object",
					properties: {
						id: { type: "string" },
						sku: { type: "string" },
						marketplace: { type: "string" },
						title: { type: "string" },
						url: { type: "string" },
						image: { type: "string", nullable: true },
						isActive: { type: "boolean" },
						createdAt: { type: "string" },
						updatedAt: { type: "string" },
						latestPrice: {
							type: "object",
							nullable: true,
							properties: {
								id: { type: "string" },
								productId: { type: "string" },
								price: { type: "integer" },
								currency: { type: "string" },
								inStock: { type: "boolean" },
								createdAt: { type: "string" }
							}
						}
					}
				}
			}
		}
	}
};

export const getProductByIdSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Получить информацию о конкретном товаре по ID",
	params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
};

export const getProductHistorySchema: FastifySchema = {
	tags: ["Products"],
	summary: "История изменения цен товара",
	params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
};

export const updateProductStatusSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Включить или выключить отслеживание товара",
	params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
	body: {
		type: "object",
		required: ["isActive"],
		properties: { isActive: { type: "boolean", description: "Статус отслеживания товара" } }
	}
};

export const deleteProductSchema: FastifySchema = {
	tags: ["Products"],
	summary: "Удалить товар из базы данных",
	params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }
};

```

---

# Файл: sandbox.ts
**Путь:** `sandbox.ts`

```typescript
import { shuffle } from "./library/arrays.js";

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
console.log("Numbers:", shuffle(numbers));
console.log("Original intact:", numbers); // Проверяем, что оригинал не тронут

// 2. Массив строк
const fruits = ["яблоко", "банан", "апельсин", "груша", "киви"];
console.log("Fruits:", shuffle(fruits));

// 3. Массив объектов (интерфейсы)
interface Task {
	id: number;
	title: string;
	completed: boolean;
}

const tasks: Task[] = [
	{ id: 1, title: "Купить молоко", completed: false },
	{ id: 2, title: "Сделать дз по TS", completed: true },
	{ id: 3, title: "Погулять с собакой", completed: false }
];
console.log("Tasks:", shuffle(tasks));

// 4. Граничные случаи (пустой массив и массив из 1 элемента)
console.log("Empty:", shuffle([]));
console.log("Single element:", shuffle([42]));

```

---

# Файл: productPricesService.ts
**Путь:** `services\productPricesService.ts`

```typescript
import { desc, eq } from "drizzle-orm";
import db from "../database/client.js";
import { productPricesTable } from "../database/schema.js";
import { NewProductPrice, ProductPrice } from "../database/types.js";

export async function createPrice(newPrice: NewProductPrice): Promise<ProductPrice> {
	const [addedPrice] = await db.insert(productPricesTable).values(newPrice).returning();
	return addedPrice;
}

export async function getPriceHistory(productId: string): Promise<ProductPrice[]> {
	const prices = await db.select().from(productPricesTable).where(eq(productPricesTable.productId, productId)).orderBy(
		desc(productPricesTable.createdAt)
	);
	return prices;
}

export async function getLatestPrice(productId: string): Promise<ProductPrice | null> {
	const [latestPrice] = await db
		.select()
		.from(productPricesTable)
		.where(eq(productPricesTable.productId, productId))
		.orderBy(desc(productPricesTable.createdAt))
		.limit(1);

	let result: ProductPrice | null = null;
	if (latestPrice) {
		result = latestPrice;
	}
	return result;
}

```

---

# Файл: productsService.ts
**Путь:** `services\productsService.ts`

```typescript
import { desc, eq } from "drizzle-orm";
import db from "../database/client.js";
import { productPricesTable, productsTable } from "../database/schema.js";
import type { NewProduct, Product } from "../database/types.js";

type MarketplaceName = "OZON" | "WILDBERRIES" | "YANDEX_MARKET" | "AVITO";

export type UpdateProductPayload = Partial<Omit<NewProduct, "id" | "createdAt">>;

export interface ProductWithLatestPrice extends Product {
	latestPrice: { id: string; productId: string; price: number; currency: string; inStock: boolean; createdAt: Date; } | null;
}

export async function createProduct(newProduct: NewProduct): Promise<Product> {
	const [addedProduct] = await db.insert(productsTable).values(newProduct).returning();
	return addedProduct;
}

export async function getProducts(): Promise<Product[]> {
	const products = await db.select().from(productsTable);
	return products;
}

export async function getProductsWithLatestPrice(): Promise<ProductWithLatestPrice[]> {
	const latestPricesSubquery = db
		.selectDistinctOn([productPricesTable.productId], {
			id: productPricesTable.id,
			productId: productPricesTable.productId,
			price: productPricesTable.price,
			currency: productPricesTable.currency,
			inStock: productPricesTable.inStock,
			createdAt: productPricesTable.createdAt
		})
		.from(productPricesTable)
		.orderBy(productPricesTable.productId, desc(productPricesTable.createdAt))
		.as("latest_prices");

	const rows = await db
		.select({
			product: productsTable,
			priceId: latestPricesSubquery.id,
			priceProductId: latestPricesSubquery.productId,
			priceValue: latestPricesSubquery.price,
			priceCurrency: latestPricesSubquery.currency,
			priceInStock: latestPricesSubquery.inStock,
			priceCreatedAt: latestPricesSubquery.createdAt
		})
		.from(productsTable)
		.leftJoin(latestPricesSubquery, eq(productsTable.id, latestPricesSubquery.productId));

	const productsWithPrice: ProductWithLatestPrice[] = [];
	for (const row of rows) {
		let latestPrice = null;
		if (row.priceId !== null && row.priceProductId !== null && row.priceValue !== null) {
			latestPrice = {
				id: row.priceId,
				productId: row.priceProductId,
				price: row.priceValue,
				currency: row.priceCurrency as string,
				inStock: row.priceInStock as boolean,
				createdAt: row.priceCreatedAt as Date
			};
		}

		const item: ProductWithLatestPrice = { ...row.product, latestPrice: latestPrice };
		productsWithPrice.push(item);
	}

	return productsWithPrice;
}

export async function getProductsByMarketplace(marketplaceName: MarketplaceName): Promise<Product[]> {
	const products = await db.select().from(productsTable).where(eq(productsTable.marketplace, marketplaceName));
	return products;
}

export async function getProductById(productId: string): Promise<Product | null> {
	const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
	let result: Product | null = null;
	if (product) {
		result = product;
	}
	return result;
}

export async function getProductByUrl(url: string): Promise<Product | null> {
	const [product] = await db.select().from(productsTable).where(eq(productsTable.url, url));
	let result: Product | null = null;
	if (product) {
		result = product;
	}
	return result;
}

export async function updateProduct(productId: string, payload: UpdateProductPayload): Promise<Product | null> {
	const [updatedProduct] = await db
		.update(productsTable)
		.set({ ...payload, updatedAt: new Date() })
		.where(eq(productsTable.id, productId))
		.returning();

	let result: Product | null = null;
	if (updatedProduct) {
		result = updatedProduct;
	}
	return result;
}

export async function deleteProduct(productId: string): Promise<Product | null> {
	const [deletedProduct] = await db.delete(productsTable).where(eq(productsTable.id, productId)).returning();
	let result: Product | null = null;
	if (deletedProduct) {
		result = deletedProduct;
	}
	return result;
}

```

---

# Файл: schedulerService.ts
**Путь:** `services\schedulerService.ts`

```typescript
import { Cron } from "croner";
import { runOzonUpdatePipeline } from "../pipelines/pipelineOzon.js";

export function setupScheduler(): Cron {
	const defaultPattern = "0 */6 * * *";
	const cronPattern = process.env["PARSER_CRON_PATTERN"] || defaultPattern;

	const job = new Cron(
		cronPattern,
		{
			protect: true,
			catch: (error: unknown) => {
				console.error("[Scheduler] Ошибка при выполнении задачи по расписанию:", error);
			}
		},
		async () => {
			console.log("[Scheduler] Запуск планового обновления цен Ozon...");
			await runOzonUpdatePipeline();
			console.log("[Scheduler] Плановое обновление цен завершено.");
		}
	);

	const nextRun = job.nextRun();
	console.log(`[Scheduler] Планировщик запущен с паттерном "${cronPattern}". Следующий запуск: ${nextRun?.toISOString()}`);

	return job;
}

```

---

