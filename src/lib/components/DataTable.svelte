<script>
	import { formatDate, formatNumber } from '$lib/utils/format.js';
	import { ArrowUpDown, ArrowUp, ArrowDown, Settings } from '@lucide/svelte';

	/** @type {{ data: any[], columns: string[], columnLabels?: Record<string, string>, dateColumns?: string[], numberColumns?: Record<string, number>, hiddenColumns?: string[], maxHeight?: string }} */
	let {
		data = [],
		columns = [],
		columnLabels = {},
		dateColumns = [],
		numberColumns = {},
		hiddenColumns = [],
		maxHeight = '700px'
	} = $props();

	let sortColumn = $state('');
	let sortDirection = $state('asc');

	let userHiddenColumns = $state([]);
	let showColumnMenu = $state(false);

	let visibleColumns = $derived(columns.filter(c => !hiddenColumns.includes(c) && !userHiddenColumns.includes(c)));

	let sortedData = $derived.by(() => {
		if (!sortColumn) return data;
		return [...data].sort((a, b) => {
			let va = a[sortColumn];
			let vb = b[sortColumn];
			if (va === null || va === undefined) return 1;
			if (vb === null || vb === undefined) return -1;
			if (typeof va === 'number' && typeof vb === 'number') {
				return sortDirection === 'asc' ? va - vb : vb - va;
			}
			va = String(va).toLowerCase();
			vb = String(vb).toLowerCase();
			if (va < vb) return sortDirection === 'asc' ? -1 : 1;
			if (va > vb) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	});

	function toggleSort(col) {
		if (sortColumn === col) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = col;
			sortDirection = 'asc';
		}
	}

	function getLabel(col) {
		return columnLabels[col] || col.toUpperCase().replace(/_/g, ' ');
	}

	function formatCell(row, col) {
		const val = row[col];
		if (val === null || val === undefined || val === '') return '-';
		if (dateColumns.includes(col)) return formatDate(val);
		if (col in numberColumns) return formatNumber(val, numberColumns[col]);
		return String(val);
	}

	function toggleColumn(col) {
		if (userHiddenColumns.includes(col)) {
			userHiddenColumns = userHiddenColumns.filter(c => c !== col);
		} else {
			userHiddenColumns = [...userHiddenColumns, col];
		}
	}

	function selectAllColumns() {
		userHiddenColumns = [];
	}

	function deselectAllColumns() {
		userHiddenColumns = columns.filter(c => !hiddenColumns.includes(c));
	}
</script>

<div class="table-container">
	<div class="table-info" style="position: relative;">
		<div>
			<span>Menampilkan <strong>{data.length}</strong> baris</span>
			<span class="text-muted" style="margin-left: 8px;">{visibleColumns.length} dari {columns.length} kolom</span>
		</div>
		
		<div style="position: relative;">
			<button type="button" style="background-color: var(--bg-hover, #e2e8f0); color: #0f172a; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;" onclick={() => showColumnMenu = !showColumnMenu}>
				<Settings size={16} /> Pilih Kolom
			</button>
			{#if showColumnMenu}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="column-menu-overlay" onclick={() => showColumnMenu = false}></div>
				<div class="column-menu">
					<div style="padding: 10px 16px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
						<span style="font-weight: bold; font-size: 0.8rem;">Tampilkan Kolom</span>
						<div style="display: flex; gap: 8px;">
							<button type="button" style="font-size: 0.7rem; font-weight: 600; color: var(--accent-primary); background: transparent; border: none; cursor: pointer;" onclick={selectAllColumns}>Semua</button>
							<button type="button" style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); background: transparent; border: none; cursor: pointer;" onclick={deselectAllColumns}>Kosongkan</button>
						</div>
					</div>
					<div class="column-menu-list">
						{#each columns as col}
							{#if !hiddenColumns.includes(col)}
								<label class="column-menu-item">
									<input type="checkbox" checked={!userHiddenColumns.includes(col)} onchange={() => toggleColumn(col)} />
									{getLabel(col)}
								</label>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
	<div class="table-wrapper" style="max-height: {maxHeight}">
		<table class="data-table">
			<thead>
				<tr>
					{#each visibleColumns as col}
						<th onclick={() => toggleSort(col)}>
							<span class="th-content">
								{getLabel(col)}
								<span class="sort-icon">
									{#if sortColumn === col}
										{#if sortDirection === 'asc'}
											<ArrowUp size={12} />
										{:else}
											<ArrowDown size={12} />
										{/if}
									{:else}
										<ArrowUpDown size={12} />
									{/if}
								</span>
							</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if sortedData.length === 0}
					<tr>
						<td colspan={visibleColumns.length} class="empty-row">
							Tidak ada data untuk ditampilkan
						</td>
					</tr>
				{:else}
					{#each sortedData as row}
						<tr>
							{#each visibleColumns as col}
								<td title={String(row[col] ?? '')}>{formatCell(row, col)}</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<style>
	.th-content { display: flex; align-items: center; gap: 6px; }
	.sort-icon { opacity: 0.4; display: flex; transition: opacity var(--transition-fast); }
	th:hover .sort-icon { opacity: 1; }
	.empty-row { text-align: center; padding: 40px !important; color: var(--text-muted); font-style: italic; }
	
	.column-menu-overlay {
		position: fixed;
		top: 0; left: 0; right: 0; bottom: 0;
		z-index: 99;
	}
	.column-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 8px;
		background: var(--bg-card);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		min-width: 220px;
		z-index: 100;
		display: flex;
		flex-direction: column;
	}
	.column-menu-list {
		max-height: 300px;
		overflow-y: auto;
		padding: 8px 0;
		display: flex;
		flex-direction: column;
	}
	.column-menu-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 16px;
		font-size: 0.8rem;
		cursor: pointer;
		transition: background var(--transition-fast);
		color: var(--text-primary);
	}
	.column-menu-item:hover {
		background: var(--bg-hover);
	}
	.table-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
</style>
