<script lang="ts">
	import axios from "axios";
	import { onMount } from "svelte";
	import { Link } from "svelte-routing";
	import type { ApiResponse, ProductListItem } from "@price-parser/types";
	import AddProductMenu from "../components/AddProductMenu.svelte";
	import ProductCard from "../components/ProductCard.svelte";

	type SortOption = "date-desc" | "date-asc" | "price-asc" | "price-desc" | "title-asc" | "title-desc";

	let productsList = $state<ProductListItem[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state("");
	let searchQuery = $state("");
	let activeFilter = $state<"all" | "inStock" | "outOfStock" | "paused">("all");
	let activeSort = $state<SortOption>("date-desc");

	async function loadProducts() {
		isLoading = true;
		errorMessage = "";

		try {
			const response = await axios.get<ApiResponse<ProductListItem[]>>("/api/products?price=true");

			if (response.data.success) {
				productsList = response.data.data;
			}
			else {
				errorMessage = "Сервер вернул ошибку при получении данных";
			}
		}
		catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				errorMessage = error.message;
			}
			else {
				errorMessage = "Неизвестная ошибка сети";
			}
		}
		finally {
			isLoading = false;
		}
	}

	const filteredProducts = $derived(
		productsList
			.filter((product) => {
				const matchesSearch = searchQuery === ""
					|| product.title.toLowerCase().includes(searchQuery.toLowerCase())
					|| product.sku.toLowerCase().includes(searchQuery.toLowerCase());

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
			.sort((a, b) => {
				switch (activeSort) {
					case "date-desc": {
						const dateA = new Date(a.createdAt).getTime();
						const dateB = new Date(b.createdAt).getTime();
						return dateB - dateA;
					}
					case "date-asc": {
						const dateA = new Date(a.createdAt).getTime();
						const dateB = new Date(b.createdAt).getTime();
						return dateA - dateB;
					}
					case "price-asc": {
						const priceA = a.latestPrice?.price ?? Infinity;
						const priceB = b.latestPrice?.price ?? Infinity;
						return priceA - priceB;
					}
					case "price-desc": {
						const priceA = a.latestPrice?.price ?? -Infinity;
						const priceB = b.latestPrice?.price ?? -Infinity;
						return priceB - priceA;
					}
					case "title-asc":
						return a.title.localeCompare(b.title, "ru");
					case "title-desc":
						return b.title.localeCompare(a.title, "ru");
					default:
						return 0;
				}
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
		<div class="filter-row-top">
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

			<div class="sort-box">
				<span class="sort-icon">⇅</span>
				<label for="sort-select" class="sort-label">Сортировка:</label>
				<select id="sort-select" bind:value={activeSort} class="sort-select">
					<option value="date-desc">По дате ↓</option>
					<option value="date-asc">По дате ↑</option>
					<option value="price-asc">По цене ↑</option>
					<option value="price-desc">По цене ↓</option>
					<option value="title-asc">По названию ↑</option>
					<option value="title-desc">По названию ↓</option>

				</select>
			</div>
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
		box-sizing: border-box;
		width: 100%;
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
		flex-direction: column;
		gap: 12px;
		margin-bottom: 24px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		padding: 12px 14px;
		box-sizing: border-box;
		width: 100%;
	}

	.filter-row-top {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		width: 100%;
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

	.sort-box {
		display: flex;
		align-items: center;
		gap: 8px;
		background-color: var(--bg-input);
		border: 1px solid var(--border-color);
		padding: 4px 10px;
		transition: border-color 0.15s ease;
	}

	.sort-box:focus-within {
		border-color: lawngreen;
	}

	.sort-icon {
		color: lawngreen;
		font-size: 14px;
		user-select: none;
	}

	.sort-label {
		font-size: 12px;
		color: var(--text-muted);
		user-select: none;
	}

	.sort-select {
		background: transparent;
		border: none;
		outline: none;
		color: var(--text-primary);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		padding: 4px 0;
	}

	.sort-select option {
		background-color: #0b120d;
		color: var(--text-primary);
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
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 16px;
		width: 100%;
		box-sizing: border-box;
	}

	:global(.card-link) {
		text-decoration: none;
		color: inherit;
		display: flex;
		height: 100%;
		width: 100%;
	}
</style>
