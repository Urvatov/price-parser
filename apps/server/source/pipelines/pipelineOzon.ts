import "dotenv/config";
import { PARSER_BASE_DELAY_MS, PARSER_SPREAD_DELAY_MS } from "../../config.js";
import { shuffle } from "../library/arrays.js";
import { getNormalizedOzonProductUrl } from "../library/normalize.js";
import { delayRandom } from "../library/time.js";
import { createOzonSession, parseOzonProduct } from "../parsers/parserOzon.js";
import { createPrice } from "../services/productPricesService.js";
import { createProduct, getProductByUrl, getProductsByMarketplace, updateProduct } from "../services/productsService.js";

let isOzonPipelineRunning = false;

export async function trackOzonProduct(rawInput: string | number) {
	const normalizedUrl = getNormalizedOzonProductUrl(rawInput);
	const existingProduct = await getProductByUrl(normalizedUrl);

	if (existingProduct) {
		console.log(`[Ozon] Товар уже отслеживается: "${existingProduct.title}"`);
		const resultProduct = existingProduct;
		return resultProduct;
	}

	if (isOzonPipelineRunning) {
		throw new Error("Парсер Ozon сейчас занят фоновым обновлением. Попробуйте позже.");
	}

	const ozonSession = await createOzonSession();
	const context = ozonSession.context;
	const page = ozonSession.page;

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

		await createPrice({
			productId: createdProduct.id,
			price: parsedData.price,
			inStock: parsedData.inStock
		});

		console.log(`[Ozon] Первая цена зафиксирована: ${parsedData.price} ₽ (В наличии: ${parsedData.inStock})`);

		const resultProduct = createdProduct;
		return resultProduct;
	}
	finally {
		await context.close();
	}
}

export async function runOzonUpdatePipeline(): Promise<void> {
	if (isOzonPipelineRunning) {
		console.warn("[Pipeline] Попытка запуска занятого пайплайна. Пропускаем.");
		throw new Error("Пайплайн обновления цен уже выполняется");
	}

	const ozonProducts = await getProductsByMarketplace("OZON");
	const products = shuffle(ozonProducts);

	console.log(`Найдено товаров для парсинга: ${products.length}`);

	if (products.length === 0) {
		console.log("Нет активных товаров в очереди.");
		return;
	}

	isOzonPipelineRunning = true;
	const { context, page } = await createOzonSession();

	try {
		for (let index = 0; index < products.length; index++) {
			const product = products[index];
			console.log(`\n[${index + 1}/${products.length}] "${product.title}"`);

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
				console.log("\tВ наличии: НЕТ (товар закончился или снят с продажи)");

				await createPrice({
					productId: product.id,
					price: null,
					inStock: false
				});
				console.log("\t- Статус отсутствия записан в базу данных");
			}

			if (index < products.length - 1) {
				console.log("\tПауза между запросами...");
				await delayRandom(PARSER_BASE_DELAY_MS, PARSER_SPREAD_DELAY_MS);
			}
		}
	}
	finally {
		await context.close();
		console.log("\nВсе задачи выполнены, браузер закрыт.");
		isOzonPipelineRunning = false;
	}
}
