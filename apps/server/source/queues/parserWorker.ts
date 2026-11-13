import { Job, Worker } from "bullmq";
import type { BrowserContext, Page } from "playwright";
import { config } from "../config.js";
import { delayRandom } from "../helpers/time.js";
import { createOzonSession, parseOzonProduct } from "../parsers/parserOzon.js";
import { dispatchOzonUpdatePipeline } from "../pipelines/pipelineOzon.js";
import { createPrice } from "../services/productPricesService.js";
import { updateProduct } from "../services/productsService.js";
import { PARSER_QUEUE_NAME, ParserJobData, ScrapeSingleJobData } from "./parserQueue.js";
import { redisConnection } from "./queueClient.js";

let activeSession: { context: BrowserContext; page: Page; } | null = null;
let idleTimer: NodeJS.Timeout | null = null;

async function getWorkerSession(): Promise<{ context: BrowserContext; page: Page; }> {
	if (idleTimer) {
		clearTimeout(idleTimer);
		idleTimer = null;
	}

	if (!activeSession || activeSession.context.pages().length === 0) {
		activeSession = await createOzonSession();
	}

	return activeSession;
}

function resetIdleTimer(idleTimeoutMs = 30000): void {
	if (idleTimer) {
		clearTimeout(idleTimer);
	}

	idleTimer = setTimeout(async () => {
		if (activeSession) {
			console.log("[Worker] Очередь неактивна, закрытие сессии браузера (idle timeout)...");
			try {
				await activeSession.context.close();
			}
			catch (err) {
				console.warn("[Worker] Ошибка при фоновом закрытии контекста:", err);
			}
			finally {
				activeSession = null;
			}
		}
	}, idleTimeoutMs);
}

async function closeWorkerSession(): Promise<void> {
	if (idleTimer) {
		clearTimeout(idleTimer);
		idleTimer = null;
	}

	if (activeSession) {
		try {
			await activeSession.context.close();
		}
		catch {
		}
		finally {
			activeSession = null;
		}
	}
}

async function processSingleProduct(data: ScrapeSingleJobData): Promise<void> {
	const session = await getWorkerSession();

	try {
		const parsedData = await parseOzonProduct(session.page, data.url);

		if (parsedData.title === null && !parsedData.inStock) {
			throw new Error(`Не удалось спарсить страницу товара: ${data.url} (возможно, блок или таймаут)`);
		}

		if (parsedData.title !== null || parsedData.image !== null || parsedData.sku !== null) {
			await updateProduct(data.productId, {
				title: parsedData.title ?? undefined,
				image: parsedData.image ?? undefined,
				sku: parsedData.sku ?? undefined
			});
		}

		if (parsedData.inStock && parsedData.price !== null) {
			await createPrice({
				productId: data.productId,
				price: parsedData.price,
				inStock: true
			});
		}
		else {
			await createPrice({
				productId: data.productId,
				price: null,
				inStock: false
			});
		}
	}
	catch (error) {
		await closeWorkerSession();
		throw error;
	}
}

export function startParserWorker(): Worker<ParserJobData> {
	const worker = new Worker<ParserJobData>(
		PARSER_QUEUE_NAME,
		async (job: Job<ParserJobData>) => {
			console.log(`[Worker] Начало обработки задачи "${job.name}" (ID: ${job.id}, Priority: ${job.opts.priority ?? 0})`);

			if (job.data.type === "SCRAPE_SINGLE_PRODUCT") {
				await processSingleProduct(job.data);
				await delayRandom(config.parser.baseDelayMs, config.parser.spreadDelayMs);
			}

			if (job.data.type === "SCHEDULED_UPDATE_PIPELINE") {
				await dispatchOzonUpdatePipeline();
			}

			resetIdleTimer();
			console.log(`[Worker] Задача "${job.name}" успешно завершена`);
		},
		{
			connection: redisConnection,
			concurrency: 1
		}
	);

	worker.on("failed", (job, error) => {
		console.error(`[Worker] Ошибка выполнения задачи ID: ${job?.id}:`, error.message);
		resetIdleTimer();
	});

	return worker;
}
