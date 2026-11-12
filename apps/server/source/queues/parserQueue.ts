import { Queue } from "bullmq";
import { config } from "../config.js";
import { redisConnection } from "./queueClient.js";

export const PARSER_QUEUE_NAME = "parser-queue";

export interface ScrapeSingleJobData {
	type: "SCRAPE_SINGLE_PRODUCT";
	productId: string;
	url: string;
}

export interface ScheduledUpdateJobData {
	type: "SCHEDULED_UPDATE_PIPELINE";
	marketplace: "OZON";
}

export type ParserJobData = ScrapeSingleJobData | ScheduledUpdateJobData;

export const parserQueue = new Queue<ParserJobData>(PARSER_QUEUE_NAME, {
	connection: redisConnection,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 5000
		},
		removeOnComplete: {
			count: 100
		},
		removeOnFail: {
			count: 200
		}
	}
});

export async function registerScheduledParserJobs(): Promise<void> {
	await parserQueue.upsertJobScheduler(
		"scheduled-ozon-update",
		{
			pattern: config.parser.cronPattern
		},
		{
			name: "scheduled-ozon-update-job",
			data: {
				type: "SCHEDULED_UPDATE_PIPELINE",
				marketplace: "OZON"
			}
		}
	);
}
