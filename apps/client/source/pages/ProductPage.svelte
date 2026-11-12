<script lang="ts">
	import axios from "axios";
	import { onDestroy } from "svelte";
	import { Link, navigate } from "svelte-routing";
	import { CategoryScale, Chart, LinearScale, LineController, LineElement, PointElement, Tooltip } from "chart.js";
	import type {
		ApiResponse,
		ProductDetails,
		ProductHistoryData,
		ProductPrice,
		UpdateProductResponse
	} from "@price-parser/types";

	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

	let { id }: { id: string } = $props();

	let product = $state<ProductDetails | null>(null);
	let priceHistory = $state<ProductPrice[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state("");

	let isEditingTitle = $state(false);
	let editedTitle = $state("");
	let isSavingTitle = $state(false);

	let isUpdatingStatus = $state(false);
	let isDeleting = $state(false);
	let actionFeedback = $state<{ type: "success" | "error"; text: string } | null>(null);

	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let chartInstance: Chart | null = null;

	function renderPriceChart(history: ProductPrice[]) {
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
				minute: "2-digit"
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
						borderColor: "lawngreen",
						backgroundColor: "rgba(124, 252, 0, 0.12)",
						pointBackgroundColor: "lawngreen",
						pointBorderColor: "#8eff24",
						pointHoverRadius: 6,
						pointRadius: 4,
						spanGaps: true,
						borderWidth: 2,
						tension: 0.1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						grid: {
							color: "#1a3821"
						},
						ticks: {
							color: "#88c999",
							font: {
								family: "Cascadia Code, monospace",
								size: 11
							}
						}
					},
					y: {
						grid: {
							color: "#1a3821"
						},
						ticks: {
							color: "#88c999",
							font: {
								family: "Cascadia Code, monospace",
								size: 11
							},
							callback: (value) => `${value} ₽`
						}
					}
				},
				plugins: {
					tooltip: {
						backgroundColor: "#0c140e",
						titleColor: "#e6faec",
						bodyColor: "lawngreen",
						borderColor: "lawngreen",
						borderWidth: 1,
						titleFont: {
							family: "Cascadia Code, monospace"
						},
						bodyFont: {
							family: "Cascadia Code, monospace"
						},
						callbacks: {
							label: (context) => {
								if (context.raw === null) return " Нет в наличии";
								return ` Цена: ${Number(context.raw).toLocaleString("ru-RU")} ₽`;
							}
						}
					}
				}
			}
		});
	}

	async function loadProductData(productId: string) {
		isLoading = true;
		errorMessage = "";

		try {
			const productPromise = axios.get<ApiResponse<ProductDetails>>(`/api/products/${productId}`);
			const historyPromise = axios.get<ApiResponse<ProductHistoryData>>(`/api/products/${productId}/history`);

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

	function startEditTitle() {
		if (!product) return;
		editedTitle = product.title;
		isEditingTitle = true;
	}

	function cancelEditTitle() {
		isEditingTitle = false;
		editedTitle = "";
	}

	async function saveTitle() {
		if (!product || isSavingTitle) return;
		const trimmed = editedTitle.trim();
		if (!trimmed) {
			showActionFeedback("error", "Название не может быть пустым");
			return;
		}

		isSavingTitle = true;

		try {
			const response = await axios.patch<UpdateProductResponse>(`/api/products/${product.id}/title`, {
				title: trimmed
			});

			if (response.data.success) {
				product.title = response.data.data.title;
				isEditingTitle = false;
				showActionFeedback("success", "Название товара успешно обновлено");
			}
		} catch (err: unknown) {
			let msg = "Не удалось обновить название";
			if (axios.isAxiosError(err) && err.response?.data?.error) {
				msg = err.response.data.error;
			}
			showActionFeedback("error", msg);
		} finally {
			isSavingTitle = false;
		}
	}

	async function toggleStatus() {
		if (!product || isUpdatingStatus) return;
		isUpdatingStatus = true;

		const nextStatus = !product.isActive;

		try {
			const response = await axios.patch<UpdateProductResponse>(`/api/products/${product.id}/status`, {
				isActive: nextStatus
			});

			if (response.data.success) {
				product.isActive = response.data.data.isActive;
				showActionFeedback(
					"success",
					product.isActive ? "Отслеживание товара запущено" : "Отслеживание товара остановлено"
				);
			}
		} catch (err: unknown) {
			showActionFeedback("error", "Не удалось изменить статус товара");
		} finally {
			isUpdatingStatus = false;
		}
	}

	async function handleDeleteProduct() {
		if (!product || isDeleting) return;

		const isConfirmed = confirm(
			`Вы уверены, что хотите удалить товар "${product.title}" и всю историю замеров цен?`
		);
		if (!isConfirmed) return;

		isDeleting = true;

		try {
			await axios.delete(`/api/products/${product.id}`);
			navigate("/", { replace: true });
		} catch (err: unknown) {
			isDeleting = false;
			showActionFeedback("error", "Ошибка при удалении товара");
		}
	}

	function showActionFeedback(type: "success" | "error", text: string) {
		actionFeedback = { type, text };
		setTimeout(() => {
			if (actionFeedback?.text === text) {
				actionFeedback = null;
			}
		}, 4000);
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
		<Link to="/" class="back-link">← Вернуться к списку</Link>
	</div>

	{#if actionFeedback}
		<div class="action-alert {actionFeedback.type}">
			<span>{actionFeedback.text}</span>
			<button class="alert-close" onclick={() => (actionFeedback = null)}>✕</button>
		</div>
	{/if}

	{#if isLoading}
		<div class="status-card">
			<p>⧗ Загрузка данных о товаре...</p>
		</div>
	{:else if errorMessage}
		<div class="status-card error">
			<p>✕ Ошибка: {errorMessage}</p>
			<button onclick={() => id && loadProductData(id)} class="retry-btn">Повторить</button>
		</div>
	{:else if product !== null}
		<div class="product-container">
			<!-- Карточка заголовка и деталей товара -->
			<div class="product-header-card">
				<div class="product-image-box">
					{#if product.image}
						<img src={product.image} alt={product.title} class="product-image" />
					{:else}
						<div class="no-image">НЕТ ФОТО</div>
					{/if}
				</div>

				<div class="product-info-box">
					<div class="meta-row">
						<span class="marketplace-tag">{product.marketplace}</span>
						<span class="sku-tag">SKU: {product.sku}</span>
						<span class="status-indicator" class:paused={!product.isActive}>
							{product.isActive ? "● АКТИВЕН" : "❚❚ ОСТАНОВЛЕН"}
						</span>
					</div>

					<!-- Редактирование названия -->
					{#if isEditingTitle}
						<div class="title-edit-container">
							<input
								type="text"
								bind:value={editedTitle}
								class="title-input"
								placeholder="Название товара..."
								disabled={isSavingTitle}
							/>
							<div class="title-edit-actions">
								<button class="btn btn-save" onclick={saveTitle} disabled={isSavingTitle || !editedTitle.trim()}>
									{isSavingTitle ? "Сохранение..." : "✓ Сохранить"}
								</button>
								<button class="btn btn-cancel" onclick={cancelEditTitle} disabled={isSavingTitle}>
									✕ Отмена
								</button>
							</div>
						</div>
					{:else}
						<div class="title-display-container">
							<h1 class="product-title">{product.title}</h1>
							<button class="btn-icon-edit" onclick={startEditTitle} title="Редактировать название">
								✎ Изменить
							</button>
						</div>
					{/if}

					<!-- Блок текущей цены -->
					<div class="price-display-box">
						<div class="price-label">Текущая цена:</div>
						{#if product.latestPrice !== null && product.latestPrice.inStock && product.latestPrice.price !== null}
							<div class="price-value">{product.latestPrice.price.toLocaleString("ru-RU")} ₽</div>
						{:else}
							<div class="out-of-stock-value">НЕТ В НАЛИЧИИ</div>
						{/if}
					</div>

					<div class="actions-toolbar">
						<a href={product.url} target="_blank" rel="noreferrer" class="btn btn-primary">
							Открыть на Ozon ↗
						</a>

						<button
							class="btn btn-secondary"
							onclick={toggleStatus}
							disabled={isUpdatingStatus}
						>
							{#if product.isActive}
								❚❚ Остановить
							{:else}
								▶ Запустить
							{/if}
						</button>

						<button
							class="btn btn-danger"
							onclick={handleDeleteProduct}
							disabled={isDeleting}
						>
							{#if isDeleting}
								⟳ Удаление...
							{:else}
								✕ Удалить товар
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- График изменения цены -->
			<div class="section-card">
				<div class="section-header">
					<h2>График динамики цены</h2>
					<span class="records-count">Точек замера: {priceHistory.length}</span>
				</div>

				{#if priceHistory.length === 0}
					<div class="empty-hint">История цен для этого товара пока пуста. Ожидайте первого запуска парсера.</div>
				{:else}
					<div class="chart-wrapper">
						<canvas bind:this={canvasElement}></canvas>
					</div>
				{/if}
			</div>

			<!-- История замеров списком -->
			<div class="section-card">
				<div class="section-header">
					<h2>История замеров</h2>
					<span class="records-count">Всего записей: {priceHistory.length}</span>
				</div>

				{#if priceHistory.length === 0}
					<div class="empty-hint">Записи отсутствуют.</div>
				{:else}
					<div class="history-table">
						{#each priceHistory as priceRecord (priceRecord.id)}
							<div class="history-row">
								<span class="record-date">
									{new Date(priceRecord.createdAt).toLocaleString("ru-RU")}
								</span>

								{#if priceRecord.inStock && priceRecord.price !== null}
									<span class="record-price">
										{priceRecord.price.toLocaleString("ru-RU")} ₽
									</span>
								{:else}
									<span class="record-out-of-stock">
										Нет в наличии
									</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.product-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 24px 20px;
	}

	.navigation-bar {
		margin-bottom: 20px;
	}

	:global(.back-link) {
		color: lawngreen;
		text-decoration: none;
		font-weight: 600;
		font-size: 14px;
		transition: color 0.15s ease;
	}

	:global(.back-link:hover) {
		color: #8eff24;
	}

	.action-alert {
		padding: 10px 16px;
		font-size: 13px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		border: 1px solid;
	}

	.action-alert.success {
		background-color: rgba(124, 252, 0, 0.1);
		border-color: lawngreen;
		color: lawngreen;
	}

	.action-alert.error {
		background-color: rgba(248, 113, 113, 0.1);
		border-color: var(--danger);
		color: var(--danger);
	}

	.alert-close {
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
	}

	.status-card {
		background-color: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 40px;
		text-align: center;
		color: var(--text-secondary);
	}

	.status-card.error {
		border-color: var(--danger);
		color: var(--danger);
	}

	.retry-btn {
		margin-top: 12px;
		background-color: var(--bg-input);
		color: lawngreen;
		border: 1px solid var(--border-color);
		padding: 8px 16px;
		cursor: pointer;
		font-weight: 600;
	}

	.retry-btn:hover {
		border-color: lawngreen;
		background-color: rgba(124, 252, 0, 0.1);
	}

	.product-container {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.product-header-card {
		display: flex;
		gap: 24px;
		background-color: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 24px;
	}

	@media (max-width: 768px) {
		.product-header-card {
			flex-direction: column;
		}
	}

	.product-image-box {
		width: 220px;
		height: 220px;
		background-color: var(--bg-input);
		border: 1px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.product-image {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		padding: 8px;
	}

	.no-image {
		color: var(--text-muted);
		font-size: 13px;
	}

	.product-info-box {
		display: flex;
		flex-direction: column;
		gap: 12px;
		flex: 1;
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.marketplace-tag {
		font-size: 12px;
		font-weight: 700;
		color: lawngreen;
		letter-spacing: 0.06em;
	}

	.sku-tag {
		color: var(--text-muted);
		font-size: 12px;
	}

	.status-indicator {
		font-size: 11px;
		font-weight: 700;
		color: lawngreen;
		background-color: rgba(124, 252, 0, 0.1);
		padding: 2px 8px;
		border: 1px solid lawngreen;
	}

	.status-indicator.paused {
		color: #eab308;
		background-color: rgba(234, 179, 8, 0.1);
		border-color: #eab308;
	}

	.title-display-container {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.product-title {
		font-size: 18px;
		line-height: 1.4;
		margin: 0;
		color: var(--text-primary);
		font-weight: 600;
		flex: 1;
	}

	.btn-icon-edit {
		background-color: var(--bg-input);
		color: lawngreen;
		border: 1px solid var(--border-color);
		padding: 4px 10px;
		font-size: 12px;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.15s ease;
	}

	.btn-icon-edit:hover {
		border-color: lawngreen;
		background-color: rgba(124, 252, 0, 0.1);
	}

	.title-edit-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.title-input {
		background-color: var(--bg-input);
		border: 1px solid lawngreen;
		color: var(--text-primary);
		padding: 10px;
		font-size: 15px;
		outline: none;
		width: 100%;
	}

	.title-edit-actions {
		display: flex;
		gap: 8px;
	}

	.price-display-box {
		background-color: var(--bg-input);
		border: 1px solid var(--border-color);
		padding: 12px 16px;
		margin: 4px 0;
	}

	.price-label {
		font-size: 12px;
		color: var(--text-muted);
		margin-bottom: 4px;
	}

	.price-value {
		font-size: 26px;
		font-weight: 700;
		color: lawngreen;
	}

	.out-of-stock-value {
		font-size: 18px;
		font-weight: 700;
		color: var(--danger);
	}

	.actions-toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: auto;
		padding-top: 10px;
	}

	.btn {
		padding: 8px 16px;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid transparent;
		transition: all 0.15s ease;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		letter-spacing: 0.03em;
	}

	.btn-primary {
		background-color: lawngreen;
		color: #060a07;
		border: 1px solid lawngreen;
	}

	.btn-primary:hover {
		background-color: #8eff24;
	}

	.btn-secondary {
		background-color: var(--bg-input);
		color: lawngreen;
		border-color: var(--border-color);
	}

	.btn-secondary:hover:not(:disabled) {
		border-color: lawngreen;
		background-color: rgba(124, 252, 0, 0.1);
	}

	.btn-danger {
		background-color: rgba(248, 113, 113, 0.1);
		color: var(--danger);
		border-color: var(--danger);
		margin-left: auto;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: var(--danger);
		color: #060a07;
	}

	.btn-save {
		background-color: lawngreen;
		color: #060a07;
		border: 1px solid lawngreen;
	}

	.btn-save:hover {
		background-color: #8eff24;
	}

	.btn-cancel {
		background-color: var(--bg-card);
		color: var(--text-secondary);
		border-color: var(--border-color);
	}

	.btn-cancel:hover {
		color: var(--text-primary);
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.section-card {
		background-color: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 20px;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 12px;
	}

	.section-header h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: lawngreen;
	}

	.records-count {
		font-size: 12px;
		color: var(--text-muted);
	}

	.chart-wrapper {
		position: relative;
		height: 320px;
		width: 100%;
	}

	.empty-hint {
		color: var(--text-muted);
		font-size: 13px;
		text-align: center;
		padding: 30px;
	}

	.history-table {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 400px;
		overflow-y: auto;
	}

	.history-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 14px;
		background-color: var(--bg-input);
		border: 1px solid var(--border-color);
		font-size: 13px;
	}

	.record-date {
		color: var(--text-secondary);
	}

	.record-price {
		font-weight: 700;
		color: lawngreen;
	}

	.record-out-of-stock {
		color: var(--danger);
		font-weight: 600;
		font-size: 12px;
	}
</style>
