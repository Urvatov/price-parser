<script lang="ts">
	import type { ProductCardData } from "@price-parser/types";

	let { product }: { product: ProductCardData } = $props();

	function isValidImageUrl(url?: string | null): boolean {
		if (!url) {
			return false;
		}

		return url.startsWith("http://") || url.startsWith("https://");
	}
</script>

{#if product}
	<div class="card" class:inactive={!product.isActive}>
		<div class="image-container">
			{#if isValidImageUrl(product.image)}
				<img src={product.image} alt={product.title} loading="lazy" />
			{:else}
				<div class="image-placeholder">
					{#if product.title === "Загрузка данных..."}
						⏳ СБОР ДАННЫХ
					{:else}
						НЕТ ФОТО
					{/if}
				</div>
			{/if}

			{#if product.title === "Загрузка данных..."}
				<div class="loading-overlay">⏳ ПАРСИНГ</div>
			{:else if !product.isActive}
				<div class="paused-overlay">НА ПАУЗЕ</div>
			{/if}
		</div>

		<div class="content">
			<div class="card-meta">
				<span class="badge marketplace">{product.marketplace}</span>
				{#if product.sku}
					<span class="sku">#{product.sku}</span>
				{/if}
			</div>

			<h3 class="title" title={product.title}>{product.title}</h3>

			<div class="price-container">
				{#if product.title === "Загрузка данных..."}
					<span class="parsing-status">⏳ СБОР ДАННЫХ...</span>
				{:else if product.latestPrice !== null && product.latestPrice.inStock && product.latestPrice.price !== null}
					<span class="price-value">{product.latestPrice.price.toLocaleString("ru-RU")} ₽</span>
				{:else}
					<span class="out-of-stock">НЕТ В НАЛИЧИИ</span>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.card {
		border: 1px solid var(--border-color);
		background-color: var(--bg-card);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		width: 250px;
		transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
		cursor: pointer;
	}

	.card:hover {
		border-color: lawngreen;
		transform: translateY(-2px);
		box-shadow: 0 0 12px rgba(124, 252, 0, 0.2);
	}

	.card.inactive {
		opacity: 0.6;
	}

	.image-container {
		width: 100%;
		height: 180px;
		background-color: var(--bg-input);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		border-bottom: 1px solid var(--border-color);
	}

	.image-container img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		padding: 8px;
	}

	.image-placeholder {
		color: var(--text-muted);
		font-size: 12px;
		letter-spacing: 0.05em;
	}

	.loading-overlay {
		position: absolute;
		top: 8px;
		right: 8px;
		background-color: rgba(6, 10, 7, 0.92);
		color: lawngreen;
		border: 1px solid lawngreen;
		font-size: 11px;
		font-weight: 700;
		padding: 2px 6px;
	}

	.paused-overlay {
		position: absolute;
		top: 8px;
		right: 8px;
		background-color: rgba(6, 10, 7, 0.9);
		color: #eab308;
		border: 1px solid #ca8a04;
		font-size: 11px;
		font-weight: 700;
		padding: 2px 6px;
	}

	.content {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
	}

	.card-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.badge.marketplace {
		font-size: 11px;
		font-weight: 700;
		color: lawngreen;
		letter-spacing: 0.06em;
	}

	.sku {
		font-size: 11px;
		color: var(--text-muted);
	}

	.title {
		font-size: 13px;
		line-height: 1.4;
		margin: 0;
		height: 36px;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		color: var(--text-primary);
		font-weight: 500;
	}

	.price-container {
		margin-top: auto;
		padding-top: 4px;
	}

	.price-value {
		font-size: 18px;
		font-weight: 700;
		color: lawngreen;
		text-shadow: 0 0 8px rgba(124, 252, 0, 0.3);
	}

	.parsing-status {
		font-size: 12px;
		color: lawngreen;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.out-of-stock {
		font-size: 12px;
		color: var(--danger);
		font-weight: 700;
		letter-spacing: 0.05em;
	}
</style>
