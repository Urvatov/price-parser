import fs from "fs";
import path from "path";
import { BrowserContext, chromium, Page } from "playwright";
import { config } from "../config.js";
import { extractOzonSku } from "../helpers/normalize.js";

export interface OzonParsedData {
	sku: string | null;
	title: string | null;
	price: number | null;
	image: string | null;
	inStock: boolean;
}

interface OzonSession {
	context: BrowserContext;
	page: Page;
}

interface RawCookie {
	name: string;
	value: string;
	domain?: string;
	path?: string;
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: string;
	expires?: number;
	expirationDate?: number;
	[key: string]: unknown;
}

function normalizeCookie(raw: RawCookie) {
	let sameSite: "Strict" | "Lax" | "None" | undefined;
	if (raw.sameSite) {
		const s = String(raw.sameSite).toLowerCase();
		if (s === "no_restriction" || s === "none") {
			sameSite = "None";
		}
		else if (s === "lax") {
			sameSite = "Lax";
		}
		else if (s === "strict") {
			sameSite = "Strict";
		}
	}

	const expires = raw.expirationDate ?? raw.expires;

	if (raw.domain) {
		return {
			name: raw.name,
			value: raw.value,
			domain: raw.domain,
			path: raw.path || "/",
			secure: Boolean(raw.secure),
			httpOnly: Boolean(raw.httpOnly),
			...(typeof expires === "number" ? { expires } : {}),
			...(sameSite ? { sameSite } : {})
		};
	}

	return {
		name: raw.name,
		value: raw.value,
		url: "https://www.ozon.ru",
		secure: Boolean(raw.secure),
		httpOnly: Boolean(raw.httpOnly),
		...(typeof expires === "number" ? { expires } : {}),
		...(sameSite ? { sameSite } : {})
	};
}

export async function createOzonSession(): Promise<OzonSession> {
	console.log(`[Ozon] Запуск браузера (headless: ${config.parser.headless})...`);

	const args: string[] = [
		"--disable-blink-features=AutomationControlled",
		"--no-sandbox",
		"--disable-setuid-sandbox",
		"--proxy-server=direct://",
		"--proxy-bypass-list=*"
	];

	const context = await chromium.launchPersistentContext(config.parser.profileDirectory, {
		headless: config.parser.headless,
		viewport: { width: 1280, height: 720 },
		userAgent: config.parser.userAgent,
		args: args
	});

	if (fs.existsSync(config.parser.cookiesPath)) {
		try {
			const rawState = fs.readFileSync(config.parser.cookiesPath, "utf-8");
			const state = JSON.parse(rawState);
			let cookiesToLoad: RawCookie[] = [];

			if (Array.isArray(state)) {
				cookiesToLoad = state;
			}
			else if (state && Array.isArray(state.cookies)) {
				cookiesToLoad = state.cookies;
			}

			if (cookiesToLoad.length > 0) {
				const normalizedCookies = cookiesToLoad.map(normalizeCookie);
				await context.addCookies(normalizedCookies);
				console.log(
					`[Ozon] Куки успешно импортированы из ${config.parser.cookiesPath} (${normalizedCookies.length} шт.)`
				);
			}
		}
		catch (error) {
			console.warn("[Ozon] Не удалось применить файл кук:", error);
		}
	}
	else {
		console.log(
			`[Ozon] Файл кук не найден (${config.parser.cookiesPath}). Парсер запущен в неавторизованном режиме.`
		);
	}

	await context.addInitScript(() => {
		Object.defineProperty(navigator, "webdriver", {
			get: () => undefined
		});
	});

	let page: Page;
	if (context.pages().length > 0) {
		page = context.pages()[0];
	}
	else {
		page = await context.newPage();
	}

	const session = {
		context: context,
		page: page
	};

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
		const isPriceWidgetVisible = await page.locator('[data-widget="webPrice"]').isVisible();
		if (!isPriceWidgetVisible) {
			await page.screenshot({ path: "ozon_debug.png", fullPage: true });
			console.log("[Ozon Debug] Виджет цены не найден. Скриншот ozon_debug.png сохранен.");
		}

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

		const prices: number[] = priceElements
			.map((text) => Number(text.replace(/[^\d]/g, "")))
			.filter((val) => !Number.isNaN(val) && val > 0);

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
