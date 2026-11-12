<script lang="ts">
	import axios from "axios";
	import { onMount } from "svelte";
	import { Link } from "svelte-routing";
	import type { ApiResponse, ProductListItem } from "@price-parser/types";
	import AddProductMenu from "../components/AddProductMenu.svelte";
	import ProductCard from "../components/ProductCard.svelte";

	let productsList = $state<ProductListItem[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state("");
	let searchQuery = $state("");
	let activeFilter = $state<"all" | "inStock" | "outOfStock" | "paused">("all");

	async function loadProducts() {
		isLoading = true;
		errorMessage = "";

		try {
			const response = await axios.get<ApiResponse<ProductListItem[]>>("/api/products?price=true");

			if (response.data.success) {
				productsList = response.data.data;
			} else {
				errorMessage = "Сервер вернул ошибку при получении данных";
			}
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				errorMessage = error.message;
			} else {
				errorMessage = "Неизвестная ошибка сети";
			}
		} finally {
			isLoading = false;
		}
	}

	const filteredProducts = $derived(
		productsList.filter((product) => {
			const matchesSearch =
				searchQuery === "" ||
				product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				product.sku.toLowerCase().includes(searchQuery.toLowerCase());

			if (!matchesSearch) return false;

			if (activeFilter === "inStock") {
				return product.latestPrice?.inStock && product.latestPrice?.price !== null;
			}
			if (activeFilter === "outOfStock") {
				return !product.latestPrice?.inStock || product.latestPrice?.price === null;
			}
			if (activeFilter === "paused") {
				return !product.isActive;
			}

			return true;
		})
	);

	const inStockCount = $derived(
		productsList.filter((p) => p.latestPrice?.inStock && p.latestPrice?.price !== null).length
	);

	onMount(() => {
		loadProducts();
	});
</script>

<div class="page-container">
	<header class="page-header">
		<div>
			<h1 class="page-title">Отслеживаемые товары</h1>
			<p class="page-subtitle">
				Всего: <b>{productsList.length}</b> │ В наличии: <b>{inStockCount}</b>
			</p>
		</div>

		<button class="refresh-button" onclick={loadProducts} title="Обновить список">
			⟳ Обновить
		</button>
	</header>

	<AddProductMenu onProductAdded={loadProducts} />

	<div class="filter-bar">
		<div class="search-box">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Фильтр по названию или SKU..."
				class="search-input"
			/>
			{#if searchQuery}
				<button class="clear-search" onclick={() => (searchQuery = "")}>✕</button>
			{/if}
		</div>

		<div class="filter-tabs">
			<button
				class="filter-tab"
				class:active={activeFilter === "all"}
				onclick={() => (activeFilter = "all")}
			>
				Все ({productsList.length})
			</button>
			<button
				class="filter-tab"
				class:active={activeFilter === "inStock"}
				onclick={() => (activeFilter = "inStock")}
			>
				В наличии ({inStockCount})
			</button>
			<button
				class="filter-tab"
				class:active={activeFilter === "outOfStock"}
				onclick={() => (activeFilter = "outOfStock")}
			>
				Нет в наличии ({productsList.length - inStockCount})
			</button>
			<button
				class="filter-tab"
				class:active={activeFilter === "paused"}
				onclick={() => (activeFilter = "paused")}
			>
				Остановлено ({productsList.filter((p) => !p.isActive).length})
			</button>
		</div>
	</div>

	{#if isLoading}
		<div class="status-box">
			<p> ⧗ Загрузка товаров из базы данных...</p>
		</div>
	{:else if errorMessage}
		<div class="status-box error">
			<p>✕ Ошибка: {errorMessage}</p>
			<button onclick={loadProducts} class="retry-button">Повторить попытку</button>
		</div>
	{:else if filteredProducts.length === 0}
		<div class="status-box empty">
			{#if searchQuery || activeFilter !== "all"}
				<p>По вашему запросу ничего не найдено.</p>
				<button class="retry-button" onclick={() => { searchQuery = ""; activeFilter = "all"; }}>
					Сбросить фильтры
				</button>
			{:else}
				<p>В базе пока нет отслеживаемых товаров.</p>
				<p class="hint">Вставьте ссылку на товар Ozon в форме выше, чтобы начать мониторинг.</p>
			{/if}
		</div>
	{:else}
		<div class="cards-grid">
			{#each filteredProducts as product (product.id)}
				<Link to={`/products/${product.id}`} class="card-link">
					<ProductCard {product} />
				</Link>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page-container {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px 20px;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 20px;
		gap: 16px;
	}

	.page-title {
		margin: 0 0 6px;
		font-size: 24px;
		font-weight: 700;
		color: lawngreen;
	}

	.page-subtitle {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.page-subtitle b {
		color: lawngreen;
	}

	.refresh-button {
		background-color: var(--bg-card);
		color: lawngreen;
		border: 1px solid var(--border-color);
		padding: 8px 14px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.refresh-button:hover {
		background-color: lawngreen;
		border-color: lawngreen;
		color: #060a07;
	}

	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		padding: 10px 14px;
	}

	.search-box {
		flex: 1;
		min-width: 240px;
		display: flex;
		align-items: center;
		background-color: var(--bg-input);
		border: 1px solid var(--border-color);
		padding: 0 10px;
		transition: border-color 0.15s ease;
	}

	.search-box:focus-within {
		border-color: lawngreen;
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: var(--text-primary);
		font-size: 13px;
		padding: 8px 0;
	}

	.search-input::placeholder {
		color: var(--text-muted);
	}

	.clear-search {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 12px;
	}

	.clear-search:hover {
		color: lawngreen;
	}

	.filter-tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.filter-tab {
		background: transparent;
		border: 1px solid transparent;
		color: var(--text-secondary);
		padding: 6px 10px;
		font-size: 12px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-tab:hover {
		color: lawngreen;
		background-color: var(--bg-card);
	}

	.filter-tab.active {
		background-color: var(--bg-card);
		color: lawngreen;
		border-color: lawngreen;
		font-weight: 700;
	}

	.status-box {
		background-color: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 40px 20px;
		text-align: center;
		color: var(--text-secondary);
	}

	.status-box.error {
		border-color: var(--danger);
		color: var(--danger);
	}

	.status-box .hint {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 8px;
	}

	.retry-button {
		margin-top: 12px;
		background-color: var(--bg-input);
		color: lawngreen;
		border: 1px solid var(--border-color);
		padding: 8px 16px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.retry-button:hover {
		border-color: lawngreen;
		background-color: rgba(124, 252, 0, 0.1);
	}

	.cards-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}

	:global(.card-link) {
		text-decoration: none;
		color: inherit;
		display: block;
	}
</style>
