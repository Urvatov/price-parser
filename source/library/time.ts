export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function delayRandom(ms: number, spread: number = 500): Promise<void> {
	const min = Math.max(0, ms - spread);
	const max = ms + spread;
	const randomMs = Math.floor(Math.random() * (max - min + 1)) + min;
	return delay(randomMs);
}
