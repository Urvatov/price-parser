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
	<div class="card">
		<div class="image-container">
			{#if isValidImageUrl(product.image)}
				<img src={product.image} alt={product.title} />
			{:else}
				<div class="image-placeholder">Нет изображения</div>
			{/if}
		</div>

		<div class="content">
			<span class="badge">{product.marketplace}</span>
			<h3 class="title" title={product.title}>{product.title}</h3>

			<div class="price-container">
				{#if product.latestPrice !== null && product.latestPrice.inStock && product.latestPrice.price !== null}
					<span class="price-value">{product.latestPrice.price.toLocaleString("ru-RU")} ₽</span>
				{:else}
					<span class="out-of-stock"><b>НЕТ В НАЛИЧИИ</b></span>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.card {
		border: 1px solid #e2e8f0;
		background-color: #ffffff;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		width: 260px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.image-container {
		width: 100%;
		height: 180px;
		background-color: #f1f5f9;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.image-container img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.image-placeholder {
		color: #94a3b8;
		font-size: 13px;
	}

	.content {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.badge {
		font-size: 16px;
		font-weight: 700;
		color: #005bff;
		text-transform: uppercase;
	}

	.title {
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
