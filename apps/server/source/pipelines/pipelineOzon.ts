import { config } from "../config.js";
import { shuffle } from "../helpers/arrays.js";
import { getNormalizedOzonProductUrl } from "../helpers/normalize.js";
import { delayRandom } from "../helpers/time.js";
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
		console.log(`\nОбработка нового товара: ${normalizedUrl}`);
		const parsedData = await parseOzonProduct(page, normalizedUrl);

		if (!parsedData.title) {
			throw new Error("Не удалось спарсить страницу (нет заголовка). Возможно, капча или блок.");
		}

		const newProduct = await createProduct({
			marketplace: "OZON",
			url: normalizedUrl,
			sku: parsedData.sku || "unknown",
			title: parsedData.title,
			image: parsedData.image,
			isActive: true
		});

		console.log(`Товар успешно добавлен в базу: "${newProduct.title}" (ID: ${newProduct.id})`);

		if (parsedData.inStock && parsedData.price !== null) {
			console.log(`Текущая цена: ${parsedData.price} ₽`);
			await createPrice({
				productId: newProduct.id,
				price: parsedData.price,
				inStock: true
			});
		}
		else {
			console.log("Товар сейчас не в наличии.");
			await createPrice({
				productId: newProduct.id,
				price: null,
				inStock: false
			});
		}

		const resultProduct = newProduct;
		return resultProduct;
	}
	finally {
		await context.close();
	}
}

export async function runOzonUpdatePipeline() {
	if (isOzonPipelineRunning) {
		console.log("[Ozon Pipeline] Процесс уже выполняется, пропускаем запуск.");
		return;
	}

	isOzonPipelineRunning = true;
	console.log("\n--- Запуск планового обновления цен Ozon ---");

	const products = await getProductsByMarketplace("OZON");
	if (products.length === 0) {
		console.log("Нет активных товаров Ozon для отслеживания.");
		isOzonPipelineRunning = false;
		return;
	}

	console.log(`Найдено активных товаров: ${products.length}`);
	shuffle(products);

	const ozonSession = await createOzonSession();
	const context = ozonSession.context;
	const page = ozonSession.page;

	try {
		for (const [index, product] of products.entries()) {
			console.log(`\n[${index + 1}/${products.length}] Сканирование: "${product.title}"`);

			const parsedData = await parseOzonProduct(page, product.url);

			const updatePayload: Record<string, unknown> = {};
			let needUpdate = false;

			if (parsedData.sku && (!product.sku || product.sku === "unknown")) {
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
				console.log("\tЗадержка между запросами...");
				await delayRandom(config.parser.baseDelayMs, config.parser.spreadDelayMs);
			}
		}
	}
	finally {
		await context.close();
		console.log("\nВсе задачи выполнены, браузер закрыт.");
		isOzonPipelineRunning = false;
	}
}
