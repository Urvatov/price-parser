import { Job, Worker } from "bullmq";
import { config } from "../config.js";
import { delayRandom } from "../helpers/time.js";
import { createOzonSession, parseOzonProduct } from "../parsers/parserOzon.js";
import { runOzonUpdatePipeline } from "../pipelines/pipelineOzon.js";
import { createPrice } from "../services/productPricesService.js";
import { updateProduct } from "../services/productsService.js";
import { PARSER_QUEUE_NAME, ParserJobData, ScrapeSingleJobData } from "./parserQueue.js";
import { redisConnection } from "./queueClient.js";

async function processSingleProduct(data: ScrapeSingleJobData): Promise<void> {
	const session = await createOzonSession();
	const context = session.context;
	const page = session.page;

	try {
		const parsedData = await parseOzonProduct(page, data.url);

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
	finally {
		await context.close();
	}
}

export function startParserWorker(): Worker<ParserJobData> {
	const worker = new Worker<ParserJobData>(
		PARSER_QUEUE_NAME,
		async (job: Job<ParserJobData>) => {
			console.log(`[Worker] Начало обработки задачи "${job.name}" (ID: ${job.id})`);

			if (job.data.type === "SCRAPE_SINGLE_PRODUCT") {
				await processSingleProduct(job.data);
			}

			if (job.data.type === "SCHEDULED_UPDATE_PIPELINE") {
				await runOzonUpdatePipeline();
			}

			await delayRandom(config.parser.baseDelayMs, config.parser.spreadDelayMs);
			console.log(`[Worker] Задача "${job.name}" успешно завершена`);
		},
		{
			connection: redisConnection,
			concurrency: 1
		}
	);

	worker.on("failed", (job, error) => {
		console.error(`[Worker] Ошибка выполнения задачи ID: ${job?.id}:`, error);
	});

	return worker;
}
