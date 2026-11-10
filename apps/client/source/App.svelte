<script lang="ts">
	import { Router, Route } from "svelte-routing";
	import ProductListPage from "./pages/ProductListPage.svelte";
	import ProductPage from "./pages/ProductPage.svelte";

	let currentUrl = $state("");
</script>

<Router url={currentUrl}>
	<main>
		<!-- Передаем компонент как дочерний элемент -->
		<Route path="/">
			<ProductListPage />
		</Route>

		<!-- В параметры маршрута передаем let:params -->
		<Route path="/products/:id" let:params>
			<ProductPage id={params.id} />
		</Route>
	</main>
</Router>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #f8fafc;
		color: #0f172a;
	}

	:global(*) {
		box-sizing: border-box;
		border-radius: 0 !important;
	}
</style>
