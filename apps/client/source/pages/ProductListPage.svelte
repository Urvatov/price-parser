<script lang="ts">
	import axios from "axios";
	import { onMount } from "svelte";
	import { Link } from "svelte-routing";
	import type { ApiResponse, ProductListItem } from "@price-parser/types";

	let productsList = $state<ProductListItem[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state("");

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

	function checkValidImage(imageUrl: string | null): boolean {
		let isValid = false;

		if (imageUrl !== null) {
			if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
				isValid = true;
			}
		}

		return isValid;
	}

	onMount(() => {
		loadProducts();
	});
</script>

<div class="page-container">
	<header class="header">
		<h1>Мониторинг цен Ozon</h1>
	</header>

	{#if isLoading}
		<p class="status-message">Идет загрузка товаров из базы...</p>
	{/if}

	{#if errorMessage}
		<p class="error-message">Ошибка: {errorMessage}</p>
	{/if}

	{#if !isLoading && productsList.length === 0 && !errorMessage}
		<p class="status-message">В базе пока нет отслеживаемых товаров.</p>
	{/if}

	{#if !isLoading && productsList.length > 0}
		<div class="cards-grid">
			{#each productsList as product (product.id)}
				<!-- Ссылка оборачивает карточку и открывает страницу деталей -->
				<Link to={`/products/${product.id}`} class="card-link">
					<div class="product-card">
						<div class="image-container">
							{#if checkValidImage(product.image)}
								<img src={product.image} alt={product.title} />
							{:else}
								<div class="no-image">Нет изображения</div>
							{/if}
						</div>

						<div class="card-content">
							<span class="badge">{product.marketplace}</span>
							<h3 class="product-title" title={product.title}>{product.title}</h3>

							<div class="price-container">
								{#if product.latestPrice !== null && product.latestPrice.inStock && product.latestPrice.price !== null}
									<span class="price-value">{product.latestPrice.price.toLocaleString("ru-RU")} ₽</span>
								{:else}
									<span class="out-of-stock">Нет в наличии</span>
								{/if}
							</div>
						</div>
					</div>
				</Link>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page-container {
		max-width: 1000px;
		margin: 0 auto;
		padding: 24px 16px;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.header h1 {
		margin: 0 0 24px;
		font-size: 26px;
	}

	.status-message {
		color: #64748b;
	}

	.error-message {
		color: #dc2626;
		font-weight: 600;
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

	.product-card {
		border: 1px solid #e2e8f0;
		border-radius: 0;
		background-color: #ffffff;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		width: 240px;
		cursor: pointer;
	}

	.product-card:hover {
		border-color: #005bff;
	}

	.image-container {
		width: 100%;
		height: 180px;
		background-color: #f8fafc;
		border-radius: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.image-container img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: 0;
	}

	.no-image {
		color: #94a3b8;
		font-size: 13px;
	}

	.card-content {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.badge {
		font-size: 11px;
		font-weight: 700;
		color: #005bff;
		text-transform: uppercase;
	}

	.product-title {
		font-size: 14px;
		line-height: 1.3;
		margin: 0;
		max-height: 36px;
		overflow: hidden;
		color: #1e293b;
	}

	.price-container {
		margin-top: 4px;
	}

	.price-value {
		font-size: 18px;
		font-weight: 700;
		color: #0f172a;
	}

	.out-of-stock {
		font-size: 13px;
		color: #dc2626;
		font-weight: 600;
	}
</style>
