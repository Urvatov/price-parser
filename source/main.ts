import "dotenv/config";
import { getProducts } from "./services/productsService.js";
import { createOzonSession, parseOzonPrice } from "./parsers/ozonParser.js";
import { delayRandom } from "./library/time.js";
import { addProductPrice } from "./services/productPricesService.js";

async function main() {
	const products = await getProducts("OZON");
	console.log(`📦 Найдено товаров для парсинга: ${products.length}`);

	if (products.length === 0) {
		console.log("Нет товаров в очереди.");
		return;
	}

	const { context, page } = await createOzonSession();

	try {
		for (let i = 0; i < products.length; i++) {
			const product = products[i];
			console.log(`\n[${i + 1}/${products.length}] 🔍 "${product.title}"`);

			const price = await parseOzonPrice(page, product.url);

			if (price) {
				console.log(`   💰 Цена: ${price} ₽`);

				await addProductPrice({
					productId: product.id,
					price
				});
				console.log(`   💾 Записано в базу данных`);
			} else {
				console.log(`   ❌ Цена не найдена`);
			}

			if (i < products.length - 1) {
				console.log("   ⏳ Пауза между запросами...");
				await delayRandom(3500, 1000);
			}
		}
	} finally {
		await context.close();
		console.log("\n🏁 Все задачи выполнены, браузер закрыт.");
		process.exit(0);
	}
}

main().catch((err) => {
	console.error("Критическая ошибка:", err);
	process.exit(1);
});
