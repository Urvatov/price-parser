<script lang="ts">
	import { onMount } from "svelte";
	import axios from "axios";
	import ProductCard from "../components/ProductCard.svelte";
	import type { ApiResponse, ProductCardData } from "@price-parser/types";

	let productsList: ProductCardData[] = [];
	let isLoading = true;
	let errorMessage = "";

	async function addProduct() {}

	async function runParser() {}

	async function test(a: string, b: string) {}
	async function fetchProducts() {
		isLoading = true;
		errorMessage = "";

		try {
			const response = await axios.get<ApiResponse<ProductCardData[]>>("/api/products?price=true");

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

	onMount(() => {
		fetchProducts();
	});
</script>

<main>
	<h1>Отслеживаемые товары</h1>

	<button onclick={runParser}>Запустить парсер</button>
	<button onclick={fetchProducts}>Обновить товары</button>

	{#if isLoading}
		<p>Идет загрузка товаров из базы данных...</p>
	{/if}

	{#if errorMessage}
		<p style="color: red;">Ошибка: {errorMessage}</p>
	{/if}

	{#if !isLoading && productsList.length === 0 && !errorMessage}
		<p>В базе пока нет товаров.</p>
	{/if}

	{#if !isLoading && productsList.length > 0}
		<div class="cards-grid">
			{#each productsList as productItem (productItem.id)}
				<ProductCard product={productItem} />
			{/each}
		</div>
	{/if}
</main>

<style>
	main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 24px;
		font-family:
			Cascadia Code,
			system-ui,
			-apple-system,
			sans-serif;
	}

	.cards-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}
</style>
