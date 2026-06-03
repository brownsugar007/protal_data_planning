<script>
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/components/DataTable.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import DateRangePicker from '$lib/components/DateRangePicker.svelte';
	import { showToast } from '$lib/stores/auth.js';
	import { Monitor, Upload, Trash2, Search, RefreshCw, Download } from '@lucide/svelte';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	let activeSubTab = $state(0);
	let showRollbackModal = $state(false);
	let filterShift = $state('Semua');
	let filterPit = $state('Semua');
	let filterOwner = $state('Semua');
	let filterSearch = $state('');
	let dateStart = $state(data.dateStart || '');
	let dateEnd = $state(data.dateEnd || '');
	let delDateStart = $state('');
	let delDateEnd = $state('');
	let delShift = $state('Semua Shift');
	let confirmText = $state('');
	let uploadFile = $state(null);
	let uploading = $state(false);

	$effect(() => {
		if (form?.uploadSuccess) {
			showToast(`${form.successCount}/${form.totalSheets} sheet OB berhasil diunggah!`, form.successCount === form.totalSheets ? 'success' : 'info');
		}
		if (form?.uploadError) showToast(form.uploadError, 'error');
		if (form?.deleteSuccess) {
			showToast('Data OB berhasil dihapus dari semua tabel!', 'success');
			confirmText = '';
			showRollbackModal = false;
		}
		if (form?.deleteError) showToast(form.deleteError, 'error');
	});

	function applyDateFilter() {
		const url = new URL($page.url);
		if (dateStart) url.searchParams.set('date_start', dateStart);
		else url.searchParams.delete('date_start');
		if (dateEnd) url.searchParams.set('date_end', dateEnd);
		else url.searchParams.delete('date_end');
		goto(url.toString(), { invalidateAll: true });
	}

	function refresh() {
		filterShift = 'Semua';
		filterPit = 'Semua';
		filterOwner = 'Semua';
		filterSearch = '';
		dateStart = '';
		dateEnd = '';
		applyDateFilter();
		showToast('Semua filter di-reset dan data di-refresh!', 'info');
	}

	function getFilteredData(tabName) {
		let d = data.allData[tabName] || [];
		if (filterShift !== 'Semua' && d.length > 0 && 'shift' in (d[0] || {})) {
			d = d.filter(r => String(r.shift) == String(filterShift));
		}
		if (filterPit !== 'Semua' && d.length > 0 && 'pit' in (d[0] || {})) {
			d = d.filter(r => String(r.pit) == String(filterPit));
		}
		if (filterOwner !== 'Semua' && d.length > 0 && 'owner' in (d[0] || {})) {
			d = d.filter(r => String(r.owner) == String(filterOwner));
		}
		if (filterSearch) {
			const s = filterSearch.toLowerCase();
			d = d.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(s)));
		}
		return d;
	}

	function getColumns(tabName) {
		const d = data.allData[tabName];
		if (!d || !d.length) return [];
		return Object.keys(d[0]);
	}

	async function downloadExcel() {
		const allFiltered = {};
		for (const tabName of data.obTables) {
			allFiltered[tabName] = getFilteredData(tabName);
		}
		showToast('Memproses download...', 'info');
		const resp = await fetch('/api/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ multiSheet: allFiltered })
		});
		if (resp.ok) {
			const blob = await resp.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `OB_Data_${dateStart || 'Semua'}.xlsx`;
			a.click();
			URL.revokeObjectURL(url);
		}
	}
</script>

<svelte:head>
	<title>Modul Overburden — MGE Portal</title>
</svelte:head>

<div class="page-header">
	<h1 class="page-title">Modul Overburden (OB)</h1>
	<p class="page-subtitle">Manajemen data pengupasan tanah (Overburden) — 10 tabel data.</p>
</div>

<div class="filter-bar">
	<div class="filter-grid">
			<div class="form-group">
				<label class="form-label">Rentang Tanggal</label>
				<DateRangePicker bind:dateStart bind:dateEnd placeholder="Pilih Tanggal Mulai - Akhir" onchange={applyDateFilter} />
			</div>
			<div class="form-group">
				<label class="form-label" for="f-shift">Shift</label>
				<select id="f-shift" class="form-select" bind:value={filterShift}>
					<option>Semua</option>
					{#each data.filters.shifts as s}<option>{s}</option>{/each}
				</select>
			</div>
			<div class="form-group">
				<label class="form-label" for="f-pit">Pit</label>
				<select id="f-pit" class="form-select" bind:value={filterPit}>
					<option>Semua</option>
					{#each availablePits as p}<option>{p}</option>{/each}
				</select>
			</div>
			<div class="form-group">
				<label class="form-label" for="f-owner">Owner</label>
				<select id="f-owner" class="form-select" bind:value={filterOwner}>
					<option>Semua</option>
					{#each availableOwners as o}<option>{o}</option>{/each}
				</select>
			</div>
			<div class="form-group">
				<label class="form-label" for="f-search">Pencarian</label>
				<input id="f-search" type="text" class="form-input" placeholder="Eqnum/Loader..." bind:value={filterSearch} />
			</div>
		</div>
		<div class="filter-actions">
				<button class="btn btn-primary" onclick={applyDateFilter}><Search size={16} /> Cari</button>
				<button class="btn btn-ghost" onclick={refresh}><RefreshCw size={16} /></button>
				<button class="btn btn-success" style="background:#10b981;color:white;border:none;" onclick={downloadExcel}><Download size={16} /> Excel</button>
				
				<!-- UPLOAD FORM & TEMPLATE -->
				<a href="/api/template?type=ob" class="btn btn-ghost" style="color:var(--text-secondary);" title="Download Template Excel Kosong">
					<Download size={16} /> Template
				</a>
				<form
					method="POST"
					action="?/upload"
					enctype="multipart/form-data"
					style="display: inline-block;"
					use:enhance={() => {
						uploading = true;
						return async ({ update }) => {
							uploading = false;
							await update();
						};
					}}
				>
					<input type="file" name="file" class="hidden" accept=".xlsx,.xls" onchange={(e) => { const t = /** @type {HTMLElement} */ (e.target); const f = t.closest('form'); if (f) f.requestSubmit(); }} />
					<button type="button" class="btn" style="background:#3b82f6;color:white;border:none;" onclick={(e) => { const t = /** @type {HTMLElement} */ (e.currentTarget); const prev = /** @type {HTMLInputElement} */ (t.previousElementSibling); if (prev) { prev.value = ''; prev.click(); } }} disabled={uploading}>
						{#if uploading}<span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:4px;"></span>{:else}<Upload size={16} />{/if} Upload
					</button>
				</form>
				
				<!-- ROLLBACK BUTTON -->
				<button class="btn btn-danger" onclick={() => showRollbackModal = true}>
					<Trash2 size={16} /> Rollback
				</button>
			</div>
	</div>

	<!-- Sub-tabs for 10 OB tables -->
	<div class="ob-subtabs">
		{#each data.obTables as tabName, i}
			<button class="ob-subtab" class:active={activeSubTab === i} onclick={() => activeSubTab = i}>
				{tabName}
			</button>
		{/each}
	</div>

	{#each data.obTables as tabName, i}
		{#if activeSubTab === i}
			{@const filtered = getFilteredData(tabName)}
			{@const cols = getColumns(tabName)}
			{#if filtered.length > 0}
				<DataTable data={filtered} columns={cols} dateColumns={['date']} />
			{:else}
				<div class="card" style="padding: 48px; text-align: center;">
					<p class="text-muted">Data di tabel {tabName} kosong atau tidak sesuai filter.</p>
				</div>
			{/if}
		{/if}
	{/each}

<!-- ROLLBACK MODAL -->
{#if showRollbackModal}
	<div class="modal-overlay" onclick={(e) => { if (e.target === e.currentTarget) showRollbackModal = false; }}>
		<div class="modal-content" style="text-align: left; max-width: 500px;">
			<h2 class="card-title mb-md">Hapus Data (Rollback) OB</h2>
			<div class="alert alert-warning" style="padding:10px;">
				<span>⚠️</span>
				<span>Menghapus data akan memengaruhi ke-10 tabel OB secara bersamaan!</span>
			</div>
			<form method="POST" action="?/delete" use:enhance>
				<div class="form-group" style="margin-bottom:16px;">
					<label class="form-label">Rentang Tanggal</label>
					<DateRangePicker bind:dateStart={delDateStart} bind:dateEnd={delDateEnd} placeholder="Pilih Tanggal Mulai - Akhir" />
					<input type="hidden" name="date_start" value={delDateStart} />
					<input type="hidden" name="date_end" value={delDateEnd} />
				</div>
				<div class="form-group" style="margin-bottom:16px;">
					<label class="form-label" for="del-shift">Shift</label>
					<select id="del-shift" name="shift" class="form-select" bind:value={delShift}>
						<option>Semua Shift</option><option>1</option><option>2</option>
					</select>
				</div>
				<div class="alert alert-danger" style="padding:10px; margin-bottom:16px;">
					<span>⚠️</span>
					<span>Anda yakin ingin menghapus data OB tanggal <strong>{delDateStart}{delDateEnd ? ' s/d ' + delDateEnd : ''}</strong> ({delShift})?</span>
				</div>
				<div class="form-group mb-lg">
					<label class="form-label" for="del-confirm">Ketik 'HAPUS' untuk konfirmasi</label>
					<input id="del-confirm" type="text" class="form-input" bind:value={confirmText} placeholder="HAPUS" />
				</div>
				<div style="display: flex; gap: 12px; justify-content: flex-end;">
					<button type="button" class="btn btn-ghost" onclick={() => showRollbackModal = false}>Batal</button>
					<button type="submit" class="btn btn-danger" disabled={confirmText !== 'HAPUS' || !delDateStart}>
						Hapus Data Permanen
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if form && form.errors && form.errors.length > 0}
	<div class="toast-container">
		<div class="toast toast-error">
			Ada {form.errors.length} error saat upload tabel. Buka konsole untuk detail.
		</div>
	</div>
{/if}

<style>
	.ob-subtabs {
		display: flex;
		gap: 4px;
		overflow-x: auto;
		padding-bottom: 16px;
		margin-bottom: 16px;
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.ob-subtabs::-webkit-scrollbar { display: none; }

	.ob-subtab {
		padding: 8px 16px;
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: all var(--transition-fast);
	}

	.ob-subtab:hover {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.3);
		color: var(--color-warning);
	}

	.ob-subtab.active {
		background: linear-gradient(135deg, #ea580c, #d97706);
		color: white;
		border-color: transparent;
		box-shadow: 0 2px 8px rgba(234, 88, 12, 0.3);
	}

	.hidden { display: none; }
	.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
