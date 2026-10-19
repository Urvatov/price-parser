import { chromium, BrowserContext, Page } from "playwright";
import path from "path";
import fs from "fs";

const PROFILE_DIRECTORY = path.resolve("./profiles/ozon");

export async function createOzonSession(): Promise<{ context: BrowserContext; page: Page }> {
	const hasProfile = fs.existsSync(PROFILE_DIRECTORY);
	const isHeadless = hasProfile;

	console.log(
		isHeadless
			? "🚀 [Ozon] Запуск браузера в фоновом режиме..."
			: "👤 [Ozon] Профиль не найден. Открываем окно для ручной авторизации..."
	);

	const context = await chromium.launchPersistentContext(PROFILE_DIRECTORY, {
		headless: isHeadless,
		viewport: { width: 1440, height: 900 },
		userAgent:
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
		args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"]
	});

	const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

	if (!hasProfile) {
		console.log("👉 Войди в аккаунт Ozon (ожидание 60 сек)...");
		await new Promise((resolve) => setTimeout(resolve, 60000));
		console.log("✅ Профиль сохранен.");
	}

	return { context, page };
}

export async function parseOzonPrice(page: Page, url: string): Promise<number | null> {
	try {
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

		const priceWidget = page.locator('[data-widget="webPrice"]');
		await priceWidget.waitFor({ state: "visible", timeout: 12000 });

		const rawText = await priceWidget.locator('span[class*="tsHeadline"]:has-text("₽")').first().textContent();

		const price = Number(rawText?.replace(/[^\d]/g, ""));
		return isNaN(price) || !price ? null : price;
	} catch (error: any) {
		console.error(`⚠️ Ошибка при парсинге ${url}:`, error.message);
		return null;
	}
}
