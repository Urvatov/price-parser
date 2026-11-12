<script lang="ts">
	import axios from "axios";
	import type { AddProductResponse } from "@price-parser/types";

	let { onProductAdded }: { onProductAdded?: () => void } = $props();

	let urlInput = $state("");
	let isSubmitting = $state(false);
	let feedback = $state<{ type: "success" | "error"; text: string } | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmedUrl = urlInput.trim();

		if (!trimmedUrl) {
			feedback = { type: "error", text: "Введите ссылку на товар Ozon или SKU" };
			return;
		}

		isSubmitting = true;
		feedback = null;

		try {
			const response = await axios.post<AddProductResponse>("/api/products", {
				url: trimmedUrl
			});

			feedback = {
				type: "success",
				text: response.data.message || "Товар успешно добавлен и отправлен на парсинг"
			};
			urlInput = "";

			if (onProductAdded) {
				onProductAdded();
			}
		} catch (error: unknown) {
			let message = "Не удалось добавить товар";
			if (axios.isAxiosError(error) && error.response?.data?.error) {
				message = error.response.data.error;
			} else if (error instanceof Error) {
				message = error.message;
			}
			feedback = { type: "error", text: message };
		} finally {
			isSubmitting = false;
			setTimeout(() => {
				if (feedback?.type === "success") {
					feedback = null;
				}
			}, 6000);
		}
	}
</script>

<div class="add-product-container">
	<form class="add-product-form" onsubmit={handleSubmit}>
		<div class="input-wrapper">
			<span class="input-icon">⚡</span>
			<input
				type="text"
				bind:value={urlInput}
				placeholder="Ссылка на Ozon (https://www.ozon.ru/product/...) или SKU"
				disabled={isSubmitting}
				class="url-input"
			/>
		</div>

		<button type="submit" class="submit-button" disabled={isSubmitting || !urlInput.trim()}>
			{#if isSubmitting}
				⏳ Добавление...
			{:else}
				+ Отслеживать
			{/if}
		</button>
	</form>

	{#if feedback}
		<div class="feedback-banner {feedback.type}">
			<span>{feedback.text}</span>
			<button class="feedback-close" onclick={() => (feedback = null)}>✕</button>
		</div>
	{/if}
</div>

<style>
	.add-product-container {
		margin-bottom: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.add-product-form {
		display: flex;
		gap: 10px;
		background-color: var(--bg-card);
		border: 1px solid var(--border-color);
		padding: 12px;
	}

	.input-wrapper {
		flex: 1;
		display: flex;
		align-items: center;
		background-color: var(--bg-input);
		border: 1px solid var(--border-color);
		padding: 0 12px;
		transition: border-color 0.15s ease;
	}

	.input-wrapper:focus-within {
		border-color: lawngreen;
	}

	.input-icon {
		color: lawngreen;
		margin-right: 8px;
		font-size: 14px;
	}

	.url-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: var(--text-primary);
		font-size: 14px;
		padding: 10px 0;
	}

	.url-input::placeholder {
		color: var(--text-muted);
	}

	.submit-button {
		background-color: lawngreen;
		color: #060a07;
		border: 1px solid lawngreen;
		padding: 0 20px;
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 0.03em;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.submit-button:hover:not(:disabled) {
		background-color: #8eff24;
	}

	.submit-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.feedback-banner {
		padding: 10px 14px;
		font-size: 13px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border: 1px solid;
	}

	.feedback-banner.success {
		background-color: rgba(124, 252, 0, 0.1);
		border-color: lawngreen;
		color: lawngreen;
	}

	.feedback-banner.error {
		background-color: rgba(248, 113, 113, 0.1);
		border-color: var(--danger);
		color: var(--danger);
	}

	.feedback-close {
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 14px;
		padding: 0 4px;
	}
</style>
