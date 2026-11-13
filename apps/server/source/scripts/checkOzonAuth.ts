import fs from "fs";
import path from "path";
import { config } from "../config.js";
import { createOzonSession } from "../parsers/parserOzon.js";

async function main() {
	console.log("=== Проверка авторизации Ozon ===");
	console.log(`Путь к файлу кук: ${config.parser.cookiesPath}`);

	if (!fs.existsSync(config.parser.cookiesPath)) {
		console.error("\n[!] Файл с куками не найден!");
		console.log(`Пожалуйста, экспортируйте куки из Cookie-Editor в файл:`);
		console.log(`  -> ${config.parser.cookiesPath}`);
		process.exit(1);
	}

	const session = await createOzonSession();
	const { page, context } = session;

	try {
		console.log("[Ozon Test] Переход на https://www.ozon.ru/my/main ...");
		await page.goto("https://www.ozon.ru/my/main", { waitUntil: "domcontentloaded", timeout: 30000 });

		await page.waitForTimeout(3000);

		const currentUrl = page.url();
		console.log(`[Ozon Test] Текущий URL: ${currentUrl}`);

		const screenshotPath = path.resolve(path.dirname(config.parser.cookiesPath), "auth_check.png");
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`[Ozon Test] Скриншот сохранен: ${screenshotPath}`);

		const isLoginPage = currentUrl.includes("/login") || currentUrl.includes("/context/auth");

		if (isLoginPage) {
			console.log("\n[!] Внимание: Произошел редирект на страницу входа (/login).");
			console.log("Куки либо устарели, либо не содержат активную сессию аккаунта.");
		}
		else {
			console.log("\n[✓] Успех: Вы находитесь в личном кабинете Ozon!");
			console.log(`Откройте скриншот ${screenshotPath}, чтобы убедиться визуально.`);
		}
	}
	catch (error: unknown) {
		if (error instanceof Error) {
			console.error("\n[!] Ошибка при проверке:", error.message);
		}
	}
	finally {
		await context.close();
		process.exit(0);
	}
}

main();
