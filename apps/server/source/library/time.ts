export function delay(ms: number): Promise<void> {
	const promise = new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
	return promise;
}

export function delayRandom(ms: number, spread: number = 500): Promise<void> {
	const min = Math.max(0, ms - spread);
	const max = ms + spread;
	const randomMs = Math.floor(Math.random() * (max - min + 1)) + min;
	const promise = delay(randomMs);
	return promise;
}
