import { shuffle } from "../helpers/arrays.js";
import { parserQueue } from "../queues/parserQueue.js";
import { getProductsByMarketplace } from "../services/productsService.js";

export async function dispatchOzonUpdatePipeline(): Promise<number> {
	console.log("\n--- Формирование задач планового обновления цен Ozon ---");

	const products = await getProductsByMarketplace("OZON");
	if (products.length === 0) {
		console.log("[Ozon Pipeline] Нет активных товаров Ozon для отслеживания.");
		return 0;
	}

	console.log(`[Ozon Pipeline] Найдено активных товаров: ${products.length}`);
	shuffle(products);

	const timestamp = Date.now();
	const jobs = products.map((product) => ({
		name: `scrape-product-${product.id}`,
		data: {
			type: "SCRAPE_SINGLE_PRODUCT" as const,
			productId: product.id,
			url: product.url
		},
		opts: {
			priority: 10,
			jobId: `scheduled-${product.id}-${timestamp}`
		}
	}));

	await parserQueue.addBulk(jobs);
	console.log(`[Ozon Pipeline] Добавлено ${jobs.length} задач в очередь с приоритетом 10.`);
	return jobs.length;
}
