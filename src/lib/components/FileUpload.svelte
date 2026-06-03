<script>
	import { createEventDispatcher } from 'svelte';
	import { Upload, FileSpreadsheet, X } from '@lucide/svelte';
	import { formatFileSize } from '$lib/utils/format.js';

	let { accept = '.xlsx,.xlsb,.xls', label = 'Upload File Excel', onselect, onclear } = $props();

	let file = $state(null);
	let dragover = $state(false);

	/** @type {HTMLInputElement} */
	let inputEl;

	function handleDrop(e) {
		dragover = false;
		const dt = e.dataTransfer;
		if (dt?.files?.length) {
			file = dt.files[0];
			onselect?.(file);
		}
	}

	function handleSelect(e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		if (target.files?.length) {
			file = target.files[0];
			onselect?.(file);
		}
	}

	function clearFile() {
		file = null;
		if (inputEl) inputEl.value = '';
		onclear?.();
	}
</script>

<div class="upload-wrapper">
	{#if !file}
		<div
			class="upload-zone"
			class:dragover
			ondragover={(e) => { e.preventDefault(); dragover = true; }}
			ondragleave={() => dragover = false}
			ondrop={(e) => { e.preventDefault(); handleDrop(e); }}
			onclick={() => inputEl.click()}
			onkeypress={() => inputEl.click()}
			role="button"
			tabindex="0"
		>
			<div class="upload-icon"><Upload size={48} /></div>
			<p class="upload-text">{label}</p>
			<p class="upload-hint">Drag & drop atau klik untuk memilih file ({accept})</p>
		</div>
	{:else}
		<div class="file-selected">
			<div class="file-info">
				<FileSpreadsheet size={24} />
				<div>
					<p class="file-name">{file.name}</p>
					<p class="file-size">{formatFileSize(file.size)}</p>
				</div>
			</div>
			<button class="remove-btn" onclick={clearFile}>
				<X size={18} />
			</button>
		</div>
	{/if}
	<input
		bind:this={inputEl}
		type="file"
		{accept}
		onchange={handleSelect}
		class="hidden"
	/>
</div>

<style>
	.upload-wrapper { width: 100%; }
	.upload-zone { border: 2px dashed var(--border-default); border-radius: var(--radius-lg); padding: 48px 24px; text-align: center; cursor: pointer; transition: all var(--transition-normal); }
	.upload-zone:hover, .upload-zone.dragover { border-color: var(--accent-primary); background: rgba(14, 165, 233, 0.05); box-shadow: 0 0 30px rgba(14, 165, 233, 0.1); }
	.upload-icon { color: var(--text-muted); margin-bottom: 12px; transition: color var(--transition-normal); }
	.upload-zone:hover .upload-icon { color: var(--accent-primary); }
	.upload-text { font-size: 1rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; }
	.upload-hint { font-size: 0.85rem; color: var(--text-muted); }
	.file-selected { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: var(--bg-card); border: 1px solid var(--accent-primary); border-radius: var(--radius-md); }
	.file-info { display: flex; align-items: center; gap: 12px; color: var(--accent-primary); }
	.file-name { font-weight: 600; color: var(--text-primary); font-size: 0.95rem; }
	.file-size { font-size: 0.8rem; color: var(--text-muted); }
	.remove-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; display: flex; padding: 4px; border-radius: 4px; transition: all var(--transition-fast); }
	.remove-btn:hover { color: var(--color-danger); background: rgba(239,68,68,0.1); }
	.hidden { display: none; }
</style>
