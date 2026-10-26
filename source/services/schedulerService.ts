import { Cron } from "croner";
import { runOzonUpdatePipeline } from "../pipelines/pipelineOzon.js";

export function setupScheduler(): Cron {
	const defaultPattern = "0 */6 * * *";
	const cronPattern = process.env["PARSER_CRON_PATTERN"] || defaultPattern;

	const job = new Cron(
		cronPattern,
		{
			protect: true,
			catch: (error: unknown) => {
				console.error("[Scheduler] Ошибка при выполнении задачи по расписанию:", error);
			}
		},
		async () => {
			console.log("[Scheduler] Запуск планового обновления цен Ozon...");
			await runOzonUpdatePipeline();
			console.log("[Scheduler] Плановое обновление цен завершено.");
		}
	);

	const nextRun = job.nextRun();
	console.log(`[Scheduler] Планировщик запущен с паттерном "${cronPattern}". Следующий запуск: ${nextRun?.toISOString()}`);

	return job;
}
