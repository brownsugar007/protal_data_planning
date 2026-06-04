<script>
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import DataTable from '$lib/components/DataTable.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import DateRangePicker from '$lib/components/DateRangePicker.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { showToast } from '$lib/stores/auth.js';
	import { chunkedUpload } from '$lib/chunkedUpload.js';
	import { Monitor, Upload, Trash2, Search, RefreshCw, Download } from '@lucide/svelte';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	// Sub-module state
	let subModule = $state(data.subModule || 'hauling');
	// Client-side filters
	let filterShift = $state('Semua');
	let filterPit = $state('Semua');
	let filterVendor = $state('Semua');
	let filterUnit = $state('Semua');
	let filterSearch = $state('');
	let dateStart = $state(data.dateStart || '');
	let dateEnd = $state(data.dateEnd || '');

	// Delete form
	let delDateStart = $state('');
	let delDateEnd = $state('');
	let delShift = $state('Semua');
	let confirmDelete = $state(false);
	let showRollbackModal = $state(false);

	// Upload
	let uploadFile = $state(null);
	let uploading = $state(false);
	let uploadProgress = $state(0);

	// React to form results
	$effect(() => {
		if (form?.uploadSuccess) {
			showToast(`${form.rowCount} baris berhasil diimport!`, 'success');
		}
		if (form?.uploadError) {
			showToast(form.uploadError, 'error');
		}
		if (form?.deleteSuccess) {
			showToast('Data berhasil dihapus!', 'success');
			confirmDelete = false;
			showRollbackModal = false;
		}
		if (form?.deleteError) {
			showToast(form.deleteError, 'error');
		}
	});

	function switchSubModule(mod) {
		subModule = mod;
		const url = new URL($page.url);
		url.searchParams.set('sub', mod);
		goto(url.toString(), { replaceState: true, invalidateAll: true });
	}

	function applyDateFilter() {
		const url = new URL($page.url);
		url.searchParams.set('sub', subModule);
		if (dateStart) url.searchParams.set('date_start', dateStart);
		else url.searchParams.delete('date_start');
		if (dateEnd) url.searchParams.set('date_end', dateEnd);
		else url.searchParams.delete('date_end');
		goto(url.toString(), { invalidateAll: true });
	}

	function refresh() {
		filterShift = 'Semua';
		filterPit = 'Semua';
		filterVendor = 'Semua';
		filterUnit = 'Semua';
		filterSearch = '';
		dateStart = '';
		dateEnd = '';
		applyDateFilter();
		showToast('Semua filter di-reset dan data di-refresh!', 'info');
	}

	async function handleHaulingUpload(event) {
		const input = /** @type {HTMLInputElement} */ (event.target);
		const file = input.files?.[0];
		if (!file) return;
		input.value = '';

		uploading = true;
		uploadProgress = 0;
		showToast('Membaca file Excel...', 'info');

		try {
			if (subModule === 'hauling') {
				const dbCols = ['jml', 'day', 'date', 'shift', 'loading_date', 'voucher_number', 'pit', 'block', 'seam', 'product', 'concat', 'vendor', 'unit_type', 'unit_id', 'payload_arrival_time', 'payload_embark_time', 'weight_gross', 'weight_empty', 'weight_nett', 'destination', 'route', 'loader_id', 'tonage'];
				const result = await chunkedUpload(file, {
					table: 'coal_hauling',
					dbCols,
					sheetName: 'Timbangan',
					normalizeKey: (k) => k.toLowerCase().trim().replace(/\s+/g, '_'),
					filterRow: (row) => {
						const keys = Object.keys(row).map(k => k.toLowerCase().trim().replace(/\s+/g, '_'));
						const vi = keys.indexOf('voucher_number');
						if (vi < 0) return false;
						const origKey = Object.keys(row)[vi];
						return row[origKey] != null;
					},
					transformValue: (col, v) => {
						if ((col === 'date' || col === 'loading_date') && v instanceof Date) {
							const fixed = new Date(v.getTime() + 43200000);
							return `${fixed.getFullYear()}-${String(fixed.getMonth() + 1).padStart(2, '0')}-${String(fixed.getDate()).padStart(2, '0')}`;
						}
						if ((col === 'payload_arrival_time' || col === 'payload_embark_time') && v instanceof Date) {
							return v.toTimeString().split(' ')[0];
						}
						if ((col === 'weight_gross' || col === 'weight_empty' || col === 'weight_nett') && typeof v === 'number' && v >= 1000) {
							return v / 1000;
						}
						return v;
					},
					batchSize: 500,
					onProgress: (p) => { uploadProgress = p.percent; }
				});

				if (result.success) {
					showToast(`${result.totalSent} baris Coal Hauling berhasil diimport!`, 'success');
					await invalidateAll();
				} else {
					showToast(result.errors[0] || 'Gagal upload data.', 'error');
				}
			} else {
				// Transit uses raw row-based parsing — handled client-side
				const XLSX = await import('xlsx');
				const buffer = await file.arrayBuffer();
				const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
				const sheet = workbook.Sheets['Transit'] || workbook.Sheets[workbook.SheetNames[0]];
				const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

				let headerIdx = 0;
				for (let i = 0; i < Math.min(rawData.length, 10); i++) {
					const rowStr = rawData[i].map(x => String(x).toLowerCase()).join(' ');
					if (rowStr.includes('unit') && rowStr.includes('digger')) { headerIdx = i; break; }
				}

				const headers = rawData[headerIdx].map(h => String(h).toLowerCase().trim().replace(/\s+/g, '_'));
				const dataRows = rawData.slice(headerIdx + 1);
				const dbCols = ['date', 'shift', 'unit_code', 'model', 'type', 'brand', 'user', 'seam', 'block', 'product_code', 'product_inv', 'pit', 'digger', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'total', 'vessel', 'netto', 'periode', 'room'];

				const rows = dataRows.filter(row => {
					const dateIdx = headers.indexOf('date');
					const unitIdx = headers.indexOf('unit_code');
					return (dateIdx >= 0 && row[dateIdx] != null) || (unitIdx >= 0 && row[unitIdx] != null);
				}).map(row => {
					return dbCols.map(col => {
						const idx = headers.indexOf(col);
						if (idx < 0) return null;
						let v = row[idx] ?? null;
						if (col === 'date' && v instanceof Date) {
							const fixed = new Date(v.getTime() + 43200000);
							v = `${fixed.getFullYear()}-${String(fixed.getMonth() + 1).padStart(2, '0')}-${String(fixed.getDate()).padStart(2, '0')}`;
						}
						return v;
					});
				});

				if (!rows.length) {
					showToast('Tidak ada baris valid ditemukan.', 'error');
				} else {
					// Send in batches
					const batchSize = 500;
					let totalSent = 0;
					for (let i = 0; i < rows.length; i += batchSize) {
						const batch = rows.slice(i, i + batchSize);
						const resp = await fetch('/api/upload-batch', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ table: 'coal_transit', columns: dbCols, rows: batch })
						});
						if (resp.ok) totalSent += batch.length;
						uploadProgress = Math.round(((i + batch.length) / rows.length) * 100);
					}
					showToast(`${totalSent} baris Coal Transit berhasil diimport!`, 'success');
					await invalidateAll();
				}
			}
		} catch (err) {
			showToast(`Error: ${err.message}`, 'error');
		} finally {
			uploading = false;
			uploadProgress = 0;
		}
	}

	// Client-side filtering (just like Streamlit's Pandas filtering)
	let currentData = $derived(subModule === 'transit' ? data.transitData : data.haulingData);

	let availablePits = $derived.by(() => {
		let d = currentData || [];
		if (filterShift !== 'Semua') d = d.filter(r => String(r.shift) === String(filterShift));
		if (subModule === 'hauling') {
			if (filterVendor !== 'Semua') d = d.filter(r => String(r.vendor) === String(filterVendor));
			if (filterUnit !== 'Semua') d = d.filter(r => String(r.unit_type) === String(filterUnit));
			let opts = [...new Set(d.map(r => r.pit))].filter(Boolean).sort();
			if (filterPit !== 'Semua' && !opts.includes(filterPit)) opts.unshift(filterPit);
			return opts;
		} else {
			if (filterVendor !== 'Semua') d = d.filter(r => String(r.digger) === String(filterVendor));
			if (filterUnit !== 'Semua') d = d.filter(r => String(r.unit_type) === String(filterUnit));
			let opts = [...new Set(d.map(r => r.pit))].filter(Boolean).sort();
			if (filterPit !== 'Semua' && !opts.includes(filterPit)) opts.unshift(filterPit);
			return opts;
		}
	});

	let availableVendors = $derived.by(() => {
		let d = currentData || [];
		if (filterShift !== 'Semua') d = d.filter(r => String(r.shift) === String(filterShift));
		if (filterPit !== 'Semua') d = d.filter(r => String(r.pit) === String(filterPit));
		if (subModule === 'hauling') {
			if (filterUnit !== 'Semua') d = d.filter(r => String(r.unit_type) === String(filterUnit));
			let opts = [...new Set(d.map(r => r.vendor))].filter(Boolean).sort();
			if (filterVendor !== 'Semua' && !opts.includes(filterVendor)) opts.unshift(filterVendor);
			return opts;
		} else {
			if (filterUnit !== 'Semua') d = d.filter(r => String(r.unit_type) === String(filterUnit));
			let opts = [...new Set(d.map(r => r.digger))].filter(Boolean).sort();
			if (filterVendor !== 'Semua' && !opts.includes(filterVendor)) opts.unshift(filterVendor);
			return opts;
		}
	});

	let availableUnits = $derived.by(() => {
		let d = currentData || [];
		if (filterShift !== 'Semua') d = d.filter(r => String(r.shift) === String(filterShift));
		if (filterPit !== 'Semua') d = d.filter(r => String(r.pit) === String(filterPit));
		if (subModule === 'hauling') {
			if (filterVendor !== 'Semua') d = d.filter(r => String(r.vendor) === String(filterVendor));
			let opts = [...new Set(d.map(r => r.unit_type))].filter(Boolean).sort();
			if (filterUnit !== 'Semua' && !opts.includes(filterUnit)) opts.unshift(filterUnit);
			return opts;
		} else {
			if (filterVendor !== 'Semua') d = d.filter(r => String(r.digger) === String(filterVendor));
			let opts = [...new Set(d.map(r => r.unit_type))].filter(Boolean).sort();
			if (filterUnit !== 'Semua' && !opts.includes(filterUnit)) opts.unshift(filterUnit);
			return opts;
		}
	});

	let filteredData = $derived.by(() => {
		let d = currentData || [];
		if (filterShift !== 'Semua') d = d.filter(r => String(r.shift) == String(filterShift));
		if (subModule === 'hauling') {
			if (filterPit !== 'Semua') d = d.filter(r => String(r.pit) == String(filterPit));
			if (filterVendor !== 'Semua') d = d.filter(r => String(r.vendor) == String(filterVendor));
			if (filterUnit !== 'Semua') d = d.filter(r => String(r.unit_type) == String(filterUnit));
		} else {
			if (filterPit !== 'Semua') d = d.filter(r => String(r.pit) == String(filterPit));
			if (filterVendor !== 'Semua') d = d.filter(r => String(r.digger) == String(filterVendor));
			if (filterUnit !== 'Semua') d = d.filter(r => String(r.unit_code) == String(filterUnit));
		}
		if (filterSearch) {
			const s = filterSearch.toLowerCase();
			d = d.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(s)));
		}
		return d;
	});

	const haulingColumns = ['jml', 'day', 'date', 'shift', 'loading_date', 'voucher_number', 'pit', 'block', 'seam', 'product', 'concat', 'vendor', 'unit_type', 'unit_id', 'payload_arrival_time', 'payload_embark_time', 'weight_gross', 'weight_empty', 'weight_nett', 'destination', 'route', 'loader_id', 'tonage'];

	const transitColumns = ['id', 'date', 'shift', 'unit_code', 'model', 'type', 'brand', 'user', 'seam', 'block', 'product_code', 'product_inv', 'pit', 'digger', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'total', 'vessel', 'netto', 'periode', 'room'];

	let currentColumns = $derived(subModule === 'transit' ? transitColumns : haulingColumns);

	async function downloadExcel() {
		if (filteredData.length === 0) return;
		showToast('Memproses download...', 'info');
		
		const resp = await fetch('/api/export', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ data: filteredData, sheetName: subModule === 'transit' ? 'Data Transit' : 'Data Hauling' })
		});

		if (resp.ok) {
			const blob = await resp.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `Report_${subModule === 'transit' ? 'Transit' : 'Hauling'}_${new Date().toISOString().split('T')[0]}.xlsx`;
			a.click();
			URL.revokeObjectURL(url);
		}
	}
</script>

<svelte:head>
	<title>Coal Hauling & Transit — MGE Portal</title>
</svelte:head>

<div class="toolbar" style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px;">
	<!-- Sub-module Toggle -->
	<div class="sub-toggle" style="margin-bottom:0;">
		<button class="sub-btn" class:active={subModule === 'hauling'} onclick={() => switchSubModule('hauling')}>
			🚛 Coal Hauling
		</button>
		<button class="sub-btn" class:active={subModule === 'transit'} onclick={() => switchSubModule('transit')}>
			🔄 Coal Transit
		</button>
	</div>

	<div class="action-bar" style="display:flex; justify-content:flex-end; gap:12px;">
		<a href="/api/template?type={subModule}" class="btn btn-ghost" title="Download Template Excel Kosong">
			<Download size={16} /> Template
		</a>
		<div style="display:inline-block; position:relative;">
			<input type="file" class="hidden" accept=".xlsx,.xls,.csv" onchange={handleHaulingUpload} />
			<button type="button" class="btn btn-primary" onclick={(e) => { const prev = /** @type {HTMLInputElement} */ (e.currentTarget.previousElementSibling); if (prev) { prev.value = ''; prev.click(); } }} disabled={uploading}>
				{#if uploading}<span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:4px;"></span> {uploadProgress}%{:else}<Upload size={16} /> Upload{/if}
			</button>
		</div>
		<button class="btn btn-danger" onclick={() => showRollbackModal = true}>
			<Trash2 size={16} /> Rollback
		</button>
	</div>
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
					<option>DAY</option>
					<option>NIGHT</option>
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
				<label class="form-label" for="f-vendor">{subModule === 'hauling' ? 'Vendor' : 'Digger'}</label>
				<select id="f-vendor" class="form-select" bind:value={filterVendor}>
					<option>Semua</option>
					{#each availableVendors as v}<option>{v}</option>{/each}
				</select>
			</div>
			<div class="form-group">
				<label class="form-label" for="f-unit">{subModule === 'transit' ? 'Unit Code' : 'Unit Type'}</label>
				<select id="f-unit" class="form-select" bind:value={filterUnit}>
					<option>Semua</option>
					{#each availableUnits as u}<option>{u}</option>{/each}
				</select>
			</div>
			<div class="form-group">
				<label class="form-label" for="f-search">Pencarian</label>
				<input id="f-search" type="text" class="form-input" placeholder="Voucher/ID..." bind:value={filterSearch} />
			</div>
			<div class="filter-actions" style="margin-top:0; padding-top:0; border-top:none; justify-content:flex-start;">
				<button class="btn btn-primary" onclick={applyDateFilter}>
					<Search size={16} /> Cari
				</button>
				<button class="btn btn-ghost" onclick={refresh}>
					<RefreshCw size={16} />
				</button>
				{#if filteredData.length > 0}
					<button class="btn btn-success" style="background:#10b981;color:white;border:none;" onclick={downloadExcel}>
						<Download size={16} /> Excel
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if filteredData.length > 0}
		<DataTable
			data={filteredData}
			columns={currentColumns}
			dateColumns={subModule === 'transit' ? ['date'] : ['date', 'loading_date']}
			numberColumns={subModule === 'transit' ? {} : { weight_gross: 3, weight_empty: 3, weight_nett: 3, tonage: 2 }}
			hiddenColumns={subModule === 'transit' ? [] : []}
		/>
	{:else}
		<div class="card" style="padding: 48px; text-align: center;">
			<p class="text-muted">Data tidak ditemukan. Silakan ubah filter Anda.</p>
		</div>
	{/if}

<!-- ROLLBACK MODAL -->
{#if showRollbackModal}
	<div class="modal-overlay" onclick={(e) => { if (e.target === e.currentTarget) showRollbackModal = false; }}>
		<div class="modal-content" style="text-align: left; max-width: 500px;">
			<h2 class="card-title mb-md">Rollback / Delete Batch {subModule === 'transit' ? '(Transit)' : '(Hauling)'}</h2>
			<div class="alert alert-danger" style="padding:10px;">
				<span>⚠️</span>
				<span>Data yang dihapus tidak bisa dikembalikan.</span>
			</div>
			<form
				method="POST"
				action="?/{subModule === 'transit' ? 'deleteTransit' : 'deleteHauling'}"
				use:enhance={() => {
					return async ({ update }) => { await update(); };
				}}
			>
				<div class="form-group" style="margin-bottom:16px;">
					<label class="form-label">Rentang Tanggal</label>
					<DateRangePicker bind:dateStart={delDateStart} bind:dateEnd={delDateEnd} placeholder="Pilih Tanggal Mulai - Akhir" />
					<input type="hidden" name="date_start" value={delDateStart} />
					<input type="hidden" name="date_end" value={delDateEnd} />
				</div>
				<div class="form-group">
					<label class="form-label" for="del-shift">Shift</label>
					<select id="del-shift" name="shift" class="form-select" bind:value={delShift}>
						<option>Semua</option>
						<option>DAY</option>
						<option>NIGHT</option>
					</select>
				</div>
				<label class="form-checkbox mt-lg mb-lg">
					<input type="checkbox" bind:checked={confirmDelete} />
					Saya yakin ingin menghapus data secara permanen
				</label>
				<div style="display: flex; gap: 12px; justify-content: flex-end;">
					<button type="button" class="btn btn-ghost" onclick={() => showRollbackModal = false}>Batal</button>
					<button type="submit" class="btn btn-danger" disabled={!confirmDelete || !delDateStart}>
						Hapus Batch
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.sub-toggle {
		display: flex;
		gap: 4px;
		margin-bottom: 20px;
		background: var(--bg-card);
		padding: 4px;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-subtle);
		width: fit-content;
	}

	.sub-btn {
		padding: 10px 24px;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.sub-btn.active {
		background: var(--accent-gradient);
		color: white;
		box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
	}

	.sub-btn:not(.active):hover {
		background: rgba(14, 165, 233, 0.1);
		color: var(--text-primary);
	}
</style>


