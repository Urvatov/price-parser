export function getNormalizedOzonProductUrl(input: string): string {
	const sku = extractOzonSku(input);
	const normalizedUrl = `https://www.ozon.ru/product/${sku}/`;
	return normalizedUrl;
}

export function extractOzonSku(input: string): string {
	const trimmed = input.trim();

	// 1. Чистый артикул: "123456789"
	if (/^\d+$/.test(trimmed)) {
		return trimmed;
	}

	// 2. Формат: /product/slug-123456789/ или /product/123456789/
	const productUrlMatch = trimmed.match(/\/product\/(?:[^/?#]+-)?(\d+)(?:[/?#]|$)/);
	if (productUrlMatch && productUrlMatch[1]) {
		const sku = productUrlMatch[1];
		return sku;
	}

	// 3. Старый формат Ozon: /context/detail/id/123456789/
	const legacyUrlMatch = trimmed.match(/\/context\/detail\/id\/(\d+)(?:[/?#]|$)/);
	if (legacyUrlMatch && legacyUrlMatch[1]) {
		const sku = legacyUrlMatch[1];
		return sku;
	}

	// 4. Поиск параметра ?sku=123456789 или ?id=123456789
	const queryMatch = trimmed.match(/[?&](?:sku|id)=(\d+)(?:[&#]|$)/);
	if (queryMatch && queryMatch[1]) {
		const sku = queryMatch[1];
		return sku;
	}

	throw new Error(`Не удалось извлечь артикул Ozon из переданной строки: "${input}"`);
}
