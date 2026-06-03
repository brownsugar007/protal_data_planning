<script>
	import { Monitor, Upload } from '@lucide/svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';

	let activeTab = $state('view');
</script>

<svelte:head>
	<title>MS Kontrak — MGE Portal</title>
</svelte:head>

<div class="page-header">
	<h1 class="page-title">Modul MS Kontrak</h1>
	<p class="page-subtitle">Manajemen data Mine Survey dan volume kontrak.</p>
</div>

<div class="tab-bar">
	<button class="tab-item" class:active={activeTab === 'view'} onclick={() => activeTab = 'view'}>
		<Monitor size={16} /> View Survey
	</button>
	<button class="tab-item" class:active={activeTab === 'upload'} onclick={() => activeTab = 'upload'}>
		<Upload size={16} /> Upload Survey
	</button>
</div>

{#if activeTab === 'view'}
	<div class="card" style="padding: 48px; text-align: center;">
		<div style="font-size: 3rem; margin-bottom: 12px;">📝</div>
		<h3 style="font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Laporan Mine Survey</h3>
		<p class="text-muted">Laporan hasil survey (MS) akan tampil di sini setelah modul ini diisi.</p>
	</div>
{/if}

{#if activeTab === 'upload'}
	<div class="card">
		<h2 class="card-title mb-md">Upload Laporan Survey</h2>
		<div class="alert alert-info"><span>ℹ️</span><span>Pilih file Excel MS untuk diunggah.</span></div>
		<FileUpload label="Upload Excel MS" onselect={() => {}} onclear={() => {}} />
		<div class="mt-lg">
			<button class="btn btn-primary btn-lg btn-block" disabled>
				<Upload size={18} /> Import ke Server (Segera Hadir)
			</button>
		</div>
	</div>
{/if}
