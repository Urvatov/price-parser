import fs from "fs";
import path from "path";
import { config } from "../config.js";
import { createOzonSession } from "../parsers/parserOzon.js";

async function main() {
	console.log("=== Проверка авторизации Ozon ===");
	console.log(`Путь к файлу кук: ${config.parser.cookiesPath}`);
	console.log(`Директория профиля: ${config.parser.profileDirectory}`);

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

		await page.waitForTimeout(4000);

		const currentUrl = page.url();
		console.log(`[Ozon Test] Текущий URL: ${currentUrl}`);

		const screenshotPath = path.resolve(path.dirname(config.parser.cookiesPath), "auth_check.png");
		await page.screenshot({ path: screenshotPath, fullPage: false });
		console.log(`[Ozon Test] Скриншот сохранен: ${screenshotPath}`);

		const pageTitle = await page.title();
		const bodyText = await page.evaluate(() => document.body?.innerText || "");

		const isBlocked = bodyText.includes("Похоже, нет соединения")
			|| bodyText.includes("Доступ ограничен")
			|| pageTitle.includes("нет соединения");

		const isLoginPage = currentUrl.includes("/login")
			|| currentUrl.includes("/context/auth")
			|| bodyText.includes("Войдите по почте")
			|| bodyText.includes("Войти по номеру");

		const hasLoginButton = await page.locator('button:has-text("Войти"), a:has-text("Войти")').first().isVisible()
			.catch(() => false);

		if (isBlocked) {
			console.log('\n[✕] Ошибка: Ozon заблокировал запрос (экран "Похоже, нет соединения").');
			console.log("Сработала антифрод-защита Ozon от автоматических браузеров или недействительных токенов.");
			console.log(`Проверьте скриншот: ${screenshotPath}`);
		}
		else if (isLoginPage || hasLoginButton) {
			console.log("\n[!] Внимание: Аккаунт НЕ авторизован.");
			console.log("Страница предлагает войти в профиль. Куки устарели или не содержат активную сессию.");
			console.log(`Проверьте скриншот: ${screenshotPath}`);
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
