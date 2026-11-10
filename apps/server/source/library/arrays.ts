export function shuffle<T>(array: readonly T[]): T[] {
	const result = [...array];

	for (let currentIndex = result.length - 1; currentIndex > 0; currentIndex--) {
		const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
		[result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]];
	}

	return result;
}
