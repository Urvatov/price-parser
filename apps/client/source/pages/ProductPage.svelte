<script lang="ts">
	import axios from "axios";
	import { onDestroy } from "svelte";
	import { CategoryScale, Chart, LinearScale, LineController, LineElement, PointElement, Tooltip } from "chart.js";

	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

	interface ProductPriceRecord {
		id: string;
		productId: string;
		price: number | null;
		currency: string;
		inStock: boolean;
		createdAt: string;
	}

	interface ProductDetails {
		id: string;
		sku: string;
		marketplace: string;
		title: string;
		url: string;
		image: string | null;
		isActive: boolean;
		createdAt: string;
		latestPrice: ProductPriceRecord | null;
	}

	interface ProductResponse {
		success: boolean;
		data: ProductDetails;
	}

	interface HistoryResponse {
		success: boolean;
		data: {
			productId: string;
			history: ProductPriceRecord[];
		};
	}

	let { id }: { id: string } = $props();

	let product = $state<ProductDetails | null>(null);
	let priceHistory = $state<ProductPriceRecord[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state("");

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let chartInstance: Chart | null = null;

	function renderPriceChart(history: ProductPriceRecord[]) {
		if (canvasElement === null) {
			return;
		}

		if (chartInstance !== null) {
			chartInstance.destroy();
			chartInstance = null;
		}

		const sortedHistory = [...history].sort((firstItem, secondItem) => {
			const firstTime = new Date(firstItem.createdAt).getTime();
			const secondTime = new Date(secondItem.createdAt).getTime();
			return firstTime - secondTime;
		});

		const labels: string[] = [];
		const prices: (number | null)[] = [];

		for (const record of sortedHistory) {
			const dateLabel = new Date(record.createdAt).toLocaleDateString("ru-RU", {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
			labels.push(dateLabel);

			if (record.inStock && record.price !== null) {
				prices.push(record.price);
			} else {
				prices.push(null);
			}
		}

		chartInstance = new Chart(canvasElement, {
			type: "line",
			data: {
				labels: labels,
				datasets: [
					{
						label: "Цена Ozon (₽)",
						data: prices,
						borderColor: "#005bff",
						backgroundColor: "rgba(0, 91, 255, 0.1)",
						pointRadius: 4,
						spanGaps: true,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
			},
		});
	}

	async function loadProductData(productId: string) {
		isLoading = true;
		errorMessage = "";

		try {
			const productPromise = axios.get<ProductResponse>(`/api/products/${productId}`);
			const historyPromise = axios.get<HistoryResponse>(`/api/products/${productId}/history`);

			const [productResponse, historyResponse] = await Promise.all([productPromise, historyPromise]);

			if (productResponse.data.success) {
				product = productResponse.data.data;
			}

			if (historyResponse.data.success) {
				priceHistory = historyResponse.data.data.history;
			}
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				errorMessage = error.message;
			} else {
				errorMessage = "Не удалось загрузить данные товара";
			}
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (id) {
			loadProductData(id);
		}
	});

	$effect(() => {
		if (!isLoading && canvasElement !== null && priceHistory.length > 0) {
			renderPriceChart(priceHistory);
		}
	});

	onDestroy(() => {
		if (chartInstance !== null) {
			chartInstance.destroy();
		}
	});
</script>

<div class="product-page">
	<div class="navigation-bar">
		<a href="/" class="back-link">← Вернуться к списку</a>
	</div>

	{#if isLoading}
		<p class="status-message">Загрузка данных о товаре...</p>
	{/if}

	{#if errorMessage}
		<p class="error-message">Ошибка: {errorMessage}</p>
	{/if}

	{#if !isLoading && product !== null}
		<div class="product-container">
			<div class="product-header">
				{#if product.image}
					<img src={product.image} alt={product.title} class="product-image" />
				{/if}

				<div class="product-info">
					<span class="marketplace-badge">{product.marketplace}</span>
					<h1 class="product-title">{product.title}</h1>
					<p class="sku-label">Артикул: {product.sku}</p>

					<div class="current-price-box">
						{#if product.latestPrice !== null && product.latestPrice.inStock && product.latestPrice.price !== null}
							<span class="price-value">{product.latestPrice.price.toLocaleString("ru-RU")} ₽</span>
						{:else}
							<span class="out-of-stock-label">Нет в наличии</span>
						{/if}
					</div>

					<a href={product.url} target="_blank" rel="noreferrer" class="external-button"> Открыть на Ozon ↗ </a>
				</div>
			</div>

			<div class="chart-section">
				<h2>График изменения цены</h2>
				{#if priceHistory.length === 0}
					<p>История цен для этого товара пока пуста.</p>
				{:else}
					<div class="chart-wrapper">
						<canvas bind:this={canvasElement}></canvas>
					</div>
				{/if}
			</div>

			<div class="history-section">
				<h2>История замеров (всего: {priceHistory.length})</h2>
				<ul class="history-list">
					{#each priceHistory as priceRecord (priceRecord.id)}
						<li class="history-item">
							<span class="record-date">
								{new Date(priceRecord.createdAt).toLocaleString("ru-RU")}
							</span>

							{#if priceRecord.inStock && priceRecord.price !== null}
								<span class="record-price">
									{priceRecord.price.toLocaleString("ru-RU")} ₽
								</span>
							{:else}
								<span class="record-out-of-stock"> Нет в наличии </span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>

<style>
	.product-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 24px 16px;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.navigation-bar {
		margin-bottom: 20px;
	}

	.back-link {
		color: #005bff;
		text-decoration: none;
		font-weight: 500;
	}

	.status-message {
		color: #64748b;
	}

	.error-message {
		color: #ef4444;
		font-weight: 600;
	}

	.product-container {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.product-header {
		display: flex;
		gap: 24px;
		background-color: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 0;
		padding: 20px;
	}

	.product-image {
		width: 220px;
		height: 220px;
		object-fit: contain;
		background-color: #f8fafc;
		border-radius: 0;
	}

	.product-info {
		display: flex;
		flex-direction: column;
		gap: 10px;
		flex: 1;
	}

	.marketplace-badge {
		font-size: 11px;
		font-weight: 700;
		color: #005bff;
		text-transform: uppercase;
	}

	.product-title {
		font-size: 20px;
		line-height: 1.3;
		margin: 0;
		color: #0f172a;
	}

	.sku-label {
		font-size: 13px;
		color: #64748b;
		margin: 0;
	}

	.current-price-box {
		margin-top: 8px;
	}

	.price-value {
		font-size: 26px;
		font-weight: 700;
		color: #0f172a;
	}

	.out-of-stock-label {
		font-size: 16px;
		font-weight: 600;
		color: #dc2626;
	}

	.external-button {
		align-self: flex-start;
		margin-top: 8px;
		padding: 8px 16px;
		background-color: #f1f5f9;
		color: #0f172a;
		text-decoration: none;
		border-radius: 0;
		font-size: 14px;
		font-weight: 500;
	}

	.chart-section,
	.history-section {
		background-color: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 0;
		padding: 20px;
	}

	.chart-wrapper {
		position: relative;
		height: 350px;
		width: 100%;
	}

	.chart-section h2,
	.history-section h2 {
		font-size: 18px;
		margin-top: 0;
		margin-bottom: 16px;
	}

	.history-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.history-item {
		display: flex;
		justify-content: space-between;
		padding: 8px 12px;
		background-color: #f8fafc;
		border-radius: 0;
		font-size: 14px;
	}

	.record-date {
		color: #64748b;
	}

	.record-price {
		font-weight: 700;
		color: #0f172a;
	}

	.record-out-of-stock {
		color: #dc2626;
		font-weight: 500;
	}
</style>
