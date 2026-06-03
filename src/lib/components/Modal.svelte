<script>
	import { createEventDispatcher } from 'svelte';
	import { AlertTriangle } from '@lucide/svelte';

	let { 
		show = $bindable(false),
		title = 'Konfirmasi',
		message = 'Apakah Anda yakin?',
		confirmText = 'Ya, Lanjutkan',
		cancelText = 'Batal',
		variant = 'danger',
		onconfirm,
		oncancel
	} = $props();

	function confirm() {
		onconfirm?.();
		show = false;
	}

	function cancel() {
		oncancel?.();
		show = false;
	}
</script>

{#if show}
	<div class="modal-overlay" onclick={(e) => { if (e.target === e.currentTarget) cancel(); }}>
		<div class="modal-content">
			<div class="modal-icon {variant}">
				<AlertTriangle size={32} />
			</div>
			<h3 class="modal-title">{title}</h3>
			<p class="modal-body">{message}</p>
			<div class="modal-actions">
				<button class="btn btn-ghost" onclick={cancel}>{cancelText}</button>
				<button class="btn btn-{variant}" onclick={confirm}>{confirmText}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn var(--transition-fast) ease;
	}

	.modal-content {
		background: var(--bg-secondary);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-xl);
		padding: 32px;
		max-width: 440px;
		width: 90%;
		box-shadow: var(--shadow-lg);
		animation: slideUp var(--transition-normal) ease;
		text-align: center;
	}

	.modal-icon {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 16px;
	}

	.modal-icon.danger {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.modal-icon.primary {
		background: rgba(14, 165, 233, 0.15);
		color: #0ea5e9;
	}

	.modal-title { font-size: 1.15rem; font-weight: 800; margin-bottom: 8px; color: var(--text-primary); }
	.modal-body { color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6; font-size: 0.95rem; }
	.modal-actions { display: flex; gap: 12px; justify-content: center; }
</style>
