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

	let showRollbackModal = $state(false);
	let filterShift = $state('Semua');
	let filterLoc = $state('Semua');
	let filterVendor = $state('Semua');
	let filterUnit = $state('Semua');
	let filterSearch = $state('');
	let dateStart = $state(data.dateStart || '');
	let dateEnd = $state(data.dateEnd || '');
	let delDateStart = $state('');
	let delDateEnd = $state('');
	let delShift = $state('Semua');
	let confirmDelete = $state(false);
	let uploadFile = $state(null);
	let uploading = $state(false);

	$effect(() => {
		if (form?.uploadSuccess) {
			showToast(`${form.rowCount} baris Fuel berhasil diimport!`, 'success');
		}
		if (form?.uploadError) showToast(form.uploadError, 'error');
		if (form?.deleteSuccess) {
			showToast('Data Fuel berhasil dihapus!', 'success');
			confirmDelete = false;
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
		filterLoc = 'Semua';
		filterVendor = 'Semua';
		filterUnit = 'Semua';
		filterSearch = '';
		dateStart = '';
		dateEnd = '';
		applyDateFilter();
		showToast('Semua filter di-reset dan data di-refresh!', 'info');
	}

	let availableLocs = $derived.by(() => {
		let d = data.fuelData || [];
		if (filterShift !== 'Semua') d = d.filter(r => String(r.shift) === String(filterShift));
		if (filterVendor !== 'Semua') d = d.filter(r => String(r.vendor) === String(filterVendor));
		if (filterUnit !== 'Semua') d = d.filter(r => String(r.unit_code) === String(filterUnit));
		let opts = [...new Set(d.map(r => r.alocation))].filter(Boolean).sort();
		if (filterLoc !== 'Semua' && !opts.includes(filterLoc)) opts.unshift(filterLoc); // Keep current if valid
		return opts;
	});

	let availableVendors = $derived.by(() => {
		let d = data.fuelData || [];
		if (filterShift !== 'Semua') d = d.filter(r => String(r.shift) === String(filterShift));
		if (filterLoc !== 'Semua') d = d.filter(r => String(r.alocation) === String(filterLoc));
		if (filterUnit !== 'Semua') d = d.filter(r => String(r.unit_code) === String(filterUnit));
		let opts = [...new Set(d.map(r => r.vendor))].filter(Boolean).sort();
		if (filterVendor !== 'Semua' && !opts.includes(filterVendor)) opts.unshift(filterVendor);
		return opts;
	});

	let availableUnits = $derived.by(() => {
		let d = data.fuelData || [];
		if (filterShift !== 'Semua') d = d.filter(r => String(r.shift) === String(filterShift));
		if (filterLoc !== 'Semua') d = d.filter(r => String(r.alocation) === String(filterLoc));
		if (filterVendor !== 'Semua') d = d.filter(r => String(r.vendor) === String(filterVendor));
		let opts = [...new Set(d.map(r => r.unit_code))].filter(Boolean).sort();
		if (filterUnit !== 'Semua' && !opts.includes(filterUnit)) opts.unshift(filterUnit);
		return opts;
	});

	let filteredData = $derived.by(() => {
		let d = data.fuelData || [];
		if (filterShift !== 'Semua') d = d.filter(r => String(r.shift) == String(filterShift));
		if (filterLoc !== 'Semua') d = d.filter(r => String(r.alocation) == String(filterLoc));
		if (filterVendor !== 'Semua') d = d.filter(r => String(r.vendor) == String(filterVendor));
		if (filterUnit !== 'Semua') d = d.filter(r => String(r.unit_code) == String(filterUnit));
		if (filterSearch) {
			const s = filterSearch.toLowerCase();
			d = d.filter(r => 
				String(r.unit_code||'').toLowerCase().includes(s) || 
				String(r.no_voucher||'').toLowerCase().includes(s)
			);
		}
		return d;
	});

	const columns = ['unit_fix', 'date', 'periode', 'shift', 'time', 'reg_no', 'unit_code', 'unit_model', 'unit_type', 'brand', 'vendor', 'alocation', 'km', 'hm', 'fm_awal', 'fm_akhir', 'refueling', 'source', 'location', 'operator', 'fuelman', 'no_voucher'];

	async function downloadExcel() {
		if (filteredData.length === 0) return;
		showToast('Memproses download...', 'info');
		const resp = await fetch('/api/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ data: filteredData, sheetName: 'Data Fuel' })
		});
		if (resp.ok) {
			const blob = await resp.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `Report_Fuel_${new Date().toISOString().split('T')[0]}.xlsx`;
			a.click();
			URL.revokeObjectURL(url);
		}
	}
</script>

<svelte:head>
	<title>Modul Fuel — MGE Portal</title>
</svelte:head>

<div class="page-header">
	<h1 class="page-title">Modul Fuel</h1>
	<p class="page-subtitle">Manajemen pemakaian dan logistik bahan bakar (Fuel).</p>
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
					<option>Semua</option><option>DAY</option><option>NIGHT</option>
				</select>
			</div>
			<div class="form-group">
				<label class="form-label" for="f-loc">Lokasi</label>
				<select id="f-loc" class="form-select" bind:value={filterLoc}>
					<option>Semua</option>
					{#each availableLocs as l}<option>{l}</option>{/each}
				</select>
			</div>
			<div class="form-group">
				<label class="form-label" for="f-vendor">Vendor</label>
				<select id="f-vendor" class="form-select" bind:value={filterVendor}>
					<option>Semua</option>
					{#each availableVendors as v}<option>{v}</option>{/each}
				</select>
			</div>
			<div class="form-group">
				<label class="form-label" for="f-unit">Unit</label>
				<select id="f-unit" class="form-select" bind:value={filterUnit}>
					<option>Semua</option>
					{#each availableUnits as u}<option>{u}</option>{/each}
				</select>
			</div>
			<div class="form-group">
				<label class="form-label" for="f-search">Pencarian</label>
				<input id="f-search" type="text" class="form-input" placeholder="Voucher/ID..." bind:value={filterSearch} />
			</div>
			<div class="filter-actions">
				<button class="btn btn-primary" onclick={applyDateFilter}><Search size={16} /> Cari</button>
				<button class="btn btn-ghost" onclick={refresh}><RefreshCw size={16} /></button>
				{#if filteredData.length > 0}
					<button class="btn btn-success" style="background:#10b981;color:white;border:none;" onclick={downloadExcel}><Download size={16} /> Excel</button>
				{/if}
				<!-- UPLOAD FORM & TEMPLATE -->
				<a href="/api/template?type=fuel" class="btn btn-ghost" style="color:var(--text-secondary);" title="Download Template Excel Kosong">
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
					<button type="button" class="btn" style="background:#3b82f6;color:white;border:none;" onclick={(e) => { const t = /** @type {HTMLElement} */ (e.currentTarget); const prev = /** @type {HTMLElement} */ (t.previousElementSibling); if (prev) prev.click(); }} disabled={uploading}>
						{#if uploading}<span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:4px;"></span>{:else}<Upload size={16} />{/if} Upload
					</button>
				</form>
				
				<!-- ROLLBACK BUTTON -->
				<button class="btn btn-danger" onclick={() => showRollbackModal = true}>
					<Trash2 size={16} /> Rollback
				</button>
			</div>
		</div>
	</div>

	{#if filteredData.length > 0}
		<DataTable {columns} data={filteredData} dateColumns={['date']} numberColumns={{ km: 2, hm: 2, refueling: 2 }} hiddenColumns={['id']} />
	{:else}
		<div class="card" style="padding: 48px; text-align: center;">
			<p class="text-muted">Data fuel tidak ditemukan. Silakan ubah filter Anda.</p>
		</div>
	{/if}

<!-- ROLLBACK MODAL -->
{#if showRollbackModal}
	<div class="modal-overlay" onclick={(e) => { if (e.target === e.currentTarget) showRollbackModal = false; }}>
		<div class="modal-content" style="text-align: left; max-width: 500px;">
			<h2 class="card-title mb-md">Rollback / Delete Batch Fuel</h2>
			<div class="alert alert-danger" style="padding:10px;">
				<span>⚠️</span>
				<span>Data yang dihapus tidak bisa dikembalikan.</span>
			</div>
			<form method="POST" action="?/delete" use:enhance>
				<div class="form-group" style="margin-bottom:16px;">
					<label class="form-label">Rentang Tanggal</label>
					<DateRangePicker bind:dateStart={delDateStart} bind:dateEnd={delDateEnd} placeholder="Pilih Tanggal Mulai - Akhir" />
					<input type="hidden" name="date_start" value={delDateStart} />
					<input type="hidden" name="date_end" value={delDateEnd} />
				</div>
				<div class="form-group">
					<label class="form-label" for="del-shift">Shift</label>
					<select id="del-shift" name="shift" class="form-select" bind:value={delShift}>
						<option>Semua</option><option>DAY</option><option>NIGHT</option>
					</select>
				</div>
				<label class="form-checkbox mt-lg mb-lg">
					<input type="checkbox" bind:checked={confirmDelete} />
					Saya yakin ingin menghapus data secara permanen
				</label>
				<div style="display: flex; gap: 12px; justify-content: flex-end;">
					<button type="button" class="btn btn-ghost" onclick={() => showRollbackModal = false}>Batal</button>
					<button type="submit" class="btn btn-danger" disabled={!confirmDelete || !delDateStart}>
						Hapus Batch Fuel
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.hidden { display: none; }
	.spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
