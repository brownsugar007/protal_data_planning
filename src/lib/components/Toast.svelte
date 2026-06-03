<script>
	import { toasts } from '$lib/stores/auth.js';
	import { CircleCheck, CircleX, Info, X } from '@lucide/svelte';

	function dismiss(id) {
		toasts.update(t => t.filter(toast => toast.id !== id));
	}
</script>

{#if $toasts.length > 0}
	<div class="toast-container">
		{#each $toasts as toast (toast.id)}
			<div class="toast toast-{toast.type}">
				<span class="toast-icon">
					{#if toast.type === 'success'}
						<CircleCheck size={20} />
					{:else if toast.type === 'error'}
						<CircleX size={20} />
					{:else}
						<Info size={20} />
					{/if}
				</span>
				<span class="toast-msg">{toast.message}</span>
				<button class="toast-close" onclick={() => dismiss(toast.id)}>
					<X size={16} />
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 2000;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 20px;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: 500;
		min-width: 300px;
		max-width: 420px;
		box-shadow: var(--shadow-lg);
		animation: slideInRight var(--transition-normal) ease;
		border: 1px solid;
		backdrop-filter: blur(12px);
	}

	.toast-success { background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.3); color: #6ee7b7; }
	.toast-error { background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: #fca5a5; }
	.toast-info { background: rgba(59, 130, 246, 0.15); border-color: rgba(59, 130, 246, 0.3); color: #93c5fd; }

	.toast-icon { display: flex; flex-shrink: 0; }
	.toast-msg { flex: 1; }

	.toast-close {
		background: transparent;
		border: none;
		color: inherit;
		opacity: 0.6;
		cursor: pointer;
		display: flex;
		padding: 2px;
	}
	.toast-close:hover { opacity: 1; }
</style>
