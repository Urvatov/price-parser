import { ConnectionOptions } from "bullmq";
import { config } from "../config.js";

export const redisConnection: ConnectionOptions = {
	host: config.redis.host,
	port: config.redis.port,
	maxRetriesPerRequest: null
};
