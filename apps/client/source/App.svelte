<script lang="ts">
	import { Router, Route, Link } from "svelte-routing";
	import ProductListPage from "./pages/ProductListPage.svelte";
	import ProductPage from "./pages/ProductPage.svelte";
	import axios from "axios";

	let currentUrl = $state("");
	let isRunningParser = $state(false);
	let parserStatus = $state<{ type: "success" | "error"; text: string } | null>(null);

	async function handleRunParser() {
		if (isRunningParser) return;
		isRunningParser = true;
		parserStatus = null;

		try {
			const res = await axios.post("/api/parser/run");
			parserStatus = {
				type: "success",
				text: res.data?.message || "Очередь обновления цен запущена"
			};
		} catch (err: unknown) {
			let message = "Ошибка запуска парсера";
			if (axios.isAxiosError(err) && err.response?.data?.message) {
				message = err.response.data.message;
			}
			parserStatus = { type: "error", text: message };
		} finally {
			isRunningParser = false;
			setTimeout(() => {
				parserStatus = null;
			}, 5000);
		}
	}
</script>

<Router url={currentUrl}>
	<div class="app-layout">
		<header class="app-navbar">
			<div class="navbar-content">
				<Link to="/" class="brand-logo">
					<span class="logo-accent">⚡</span> PRICE PARSER
				</Link>

				<div class="navbar-actions">
					{#if parserStatus}
						<span class="parser-notification {parserStatus.type}">
							{parserStatus.text}
						</span>
					{/if}

					<button class="parser-button" onclick={handleRunParser} disabled={isRunningParser}>
						{#if isRunningParser}
							⏳ Запуск...
						{:else}
							▶ Запустить сбор цен
						{/if}
					</button>
				</div>
			</div>
		</header>

		<main class="main-content">
			<Route path="/">
				<ProductListPage />
			</Route>

			<Route path="/products/:id" let:params>
				<ProductPage id={params.id} />
			</Route>
		</main>
	</div>
</Router>

<style>
	.app-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.app-navbar {
		background-color: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
		padding: 14px 20px;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.navbar-content {
		max-width: 1100px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
	}

	:global(.brand-logo) {
		color: lawngreen;
		text-decoration: none;
		font-weight: 700;
		font-size: 18px;
		letter-spacing: 0.08em;
		display: flex;
		align-items: center;
		gap: 8px;
		text-shadow: 0 0 12px rgba(124, 252, 0, 0.4);
	}

	:global(.brand-logo:hover) {
		color: #8eff24;
		text-shadow: 0 0 16px rgba(124, 252, 0, 0.6);
	}

	.logo-accent {
		color: lawngreen;
	}

	.navbar-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.parser-notification {
		font-size: 13px;
		padding: 6px 12px;
		border: 1px solid;
	}

	.parser-notification.success {
		background-color: rgba(124, 252, 0, 0.1);
		border-color: lawngreen;
		color: lawngreen;
	}

	.parser-notification.error {
		background-color: rgba(239, 68, 68, 0.1);
		border-color: var(--danger);
		color: var(--danger);
	}

	.parser-button {
		background-color: var(--bg-card);
		color: lawngreen;
		border: 1px solid var(--border-color);
		padding: 8px 14px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.parser-button:hover:not(:disabled) {
		background-color: lawngreen;
		border-color: lawngreen;
		color: #060a07;
		box-shadow: 0 0 10px rgba(124, 252, 0, 0.35);
	}

	.parser-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.main-content {
		flex: 1;
	}
</style>
