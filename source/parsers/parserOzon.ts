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
