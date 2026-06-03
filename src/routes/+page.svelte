<script>
	import { onMount } from 'svelte';
	import { formatDateLong, abbreviateNumber } from '$lib/utils/format.js';
	import { invalidateAll } from '$app/navigation';
	import { Truck, Fuel, Construction, FileText } from '@lucide/svelte';
	import Chart from 'chart.js/auto';

	/** @type {{ data: any }} */
	let { data } = $props();

	let activeTab = $state('hauling');

	const tabs = [
		{ id: 'hauling', label: 'Coal Hauling', icon: '🚛' },
		{ id: 'fuel', label: 'Fuel', icon: '⛽' },
		{ id: 'ob', label: 'Overburden (OB)', icon: '🚧' },
		{ id: 'ms', label: 'MS Contract', icon: '📝' }
	];

	/** @type {HTMLCanvasElement} */
	let barCanvas;
	/** @type {HTMLCanvasElement} */
	let lineCanvas;
	let chartInstances = { bar: null, line: null };

	onMount(async () => {
		const { Chart, registerables } = await import('chart.js');
		Chart.register(...registerables);

		// Global chart defaults for light theme
		Chart.defaults.color = '#64748b';
		Chart.defaults.borderColor = '#e2e8f0';
		Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

		renderCharts(Chart);
	});

	function renderCharts(Chart) {
		destroyCharts();
		const tabData = getTabData();

		if (barCanvas && tabData.yearly.length > 0) {
			chartInstances.bar = new Chart(barCanvas, {
				type: tabData.barType,
				data: {
					labels: tabData.yearly.map(r => {
						const [y, m] = r.month.split('-');
						return new Date(y, m - 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
					}),
					datasets: [{
						label: tabData.yearlyLabel,
						data: tabData.yearly.map(r => Number(r.total)),
						backgroundColor: tabData.barColor + '55',
						borderColor: tabData.barColor,
						borderWidth: 2,
						borderRadius: 6,
						tension: 0.4,
						fill: tabData.barType === 'line',
						pointBackgroundColor: tabData.barColor,
						pointBorderColor: '#fff',
						pointBorderWidth: 2,
						pointRadius: 4
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
						tooltip: {
							backgroundColor: 'rgba(255, 255, 255, 0.95)',
							titleColor: '#0f172a',
							bodyColor: '#334155',
							borderColor: '#e2e8f0',
							borderWidth: 1,
							titleFont: { weight: '700' },
							padding: 12,
							cornerRadius: 8,
							callbacks: {
								label: (ctx) => `${tabData.yearlyLabel}: ${Number(ctx.raw).toLocaleString('id-ID')}`
							}
						}
					},
					scales: {
						x: { grid: { display: false } },
						y: { grid: { color: '#f1f5f9' }, ticks: { callback: v => abbreviateNumber(v) } }
					}
				}
			});
		}

		if (lineCanvas && tabData.daily.length > 0) {
			chartInstances.line = new Chart(lineCanvas, {
				type: tabData.lineType,
				data: {
					labels: tabData.daily.map(r => {
						const d = new Date(r.date);
						return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
					}),
					datasets: [{
						label: tabData.dailyLabel,
						data: tabData.daily.map(r => Number(r.total)),
						backgroundColor: tabData.lineColor + '22',
						borderColor: tabData.lineColor,
						borderWidth: 2.5,
						borderRadius: tabData.lineType === 'bar' ? 4 : 0,
						tension: 0.4,
						fill: tabData.lineType !== 'bar',
						pointBackgroundColor: tabData.lineColor,
						pointBorderColor: '#fff',
						pointBorderWidth: 2,
						pointRadius: 3
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
						tooltip: {
							backgroundColor: 'rgba(255, 255, 255, 0.95)',
							titleColor: '#0f172a',
							bodyColor: '#334155',
							borderColor: '#e2e8f0',
							borderWidth: 1,
							padding: 12,
							cornerRadius: 8,
							callbacks: {
								label: (ctx) => `${tabData.dailyLabel}: ${Number(ctx.raw).toLocaleString('id-ID')}`
							}
						}
					},
					scales: {
						x: { grid: { display: false }, ticks: { maxRotation: 45 } },
						y: { grid: { color: '#f1f5f9' }, ticks: { callback: v => abbreviateNumber(v) } }
					}
				}
			});
		}
	}

	function destroyCharts() {
		if (chartInstances.bar) { chartInstances.bar.destroy(); chartInstances.bar = null; }
		if (chartInstances.line) { chartInstances.line.destroy(); chartInstances.line = null; }
	}

	function getTabData() {
		switch (activeTab) {
			case 'hauling': return {
				yearly: data.haulingYearly, daily: data.haulingDaily,
				yearlyLabel: 'Total Tonase (Ton)', dailyLabel: 'Tonase Harian (Ton)',
				barType: 'bar', lineType: 'line',
				barColor: '#2563eb', lineColor: '#10b981',
				yearlyTitle: 'Trend Tonase 12 Bulan Terakhir', dailyTitle: 'Tonase Harian (30 Hari Terakhir)'
			};
			case 'fuel': return {
				yearly: data.fuelYearly, daily: data.fuelDaily,
				yearlyLabel: 'Total Fuel (Liter)', dailyLabel: 'Konsumsi Harian (Liter)',
				barType: 'line', lineType: 'bar',
				barColor: '#f43f5e', lineColor: '#f59e0b',
				yearlyTitle: 'Trend Konsumsi Fuel 12 Bulan', dailyTitle: 'Konsumsi Harian (30 Hari Terakhir)'
			};
			case 'ob': return {
				yearly: data.obYearly, daily: data.obDaily,
				yearlyLabel: 'Volume (BCM)', dailyLabel: 'Volume Harian (BCM)',
				barType: 'line', lineType: 'bar',
				barColor: '#d97706', lineColor: '#fbbf24',
				yearlyTitle: 'Trend Volume OB 12 Bulan', dailyTitle: 'Volume OB Harian (30 Hari Terakhir)'
			};
			default: return {
				yearly: [], daily: [],
				yearlyLabel: '-', dailyLabel: '-',
				barType: 'bar', lineType: 'bar',
				barColor: '#10b981', lineColor: '#10b981',
				yearlyTitle: 'Data Belum Tersedia', dailyTitle: 'Data Belum Tersedia'
			};
		}
	}

	async function switchTab(id) {
		activeTab = id;
		// Wait for DOM then re-render charts
		await new Promise(r => setTimeout(r, 50));
		const { Chart } = await import('chart.js');
		renderCharts(Chart);
	}

	let tabData = $derived(getTabData());
</script>

<svelte:head>
	<title>Dashboard — MGE Portal</title>
</svelte:head>

<div class="page-header">
	<h1 class="page-title">Dashboard Utama MGE</h1>
	<p class="page-subtitle">Ringkasan seluruh aktivitas operasional (Hauling, OB, MS, Fuel).</p>
</div>

<!-- Metric Cards -->
<div class="metric-grid">
	<div class="metric-card hauling">
		<div class="metric-icon"><Truck size={24} /></div>
		<div class="metric-content">
			<p class="metric-label">Last Sync Hauling</p>
			<p class="metric-value">{formatDateLong(data.lastHauling)}</p>
		</div>
	</div>
	<div class="metric-card fuel">
		<div class="metric-icon"><Fuel size={24} /></div>
		<div class="metric-content">
			<p class="metric-label">Last Sync Fuel</p>
			<p class="metric-value">{formatDateLong(data.lastFuel)}</p>
		</div>
	</div>
	<div class="metric-card ob">
		<div class="metric-icon"><Construction size={24} /></div>
		<div class="metric-content">
			<p class="metric-label">Last Sync OB</p>
			<p class="metric-value">{formatDateLong(data.lastOb)}</p>
		</div>
	</div>
	<div class="metric-card ms">
		<div class="metric-icon"><FileText size={24} /></div>
		<div class="metric-content">
			<p class="metric-label">Last Sync MS</p>
			<p class="metric-value">{formatDateLong(data.lastMs)}</p>
		</div>
	</div>
</div>

<!-- Tab Navigation -->
<div class="tab-bar">
	{#each tabs as tab}
		<button
			class="tab-item"
			class:active={activeTab === tab.id}
			onclick={() => switchTab(tab.id)}
		>
			<span>{tab.icon}</span>
			{tab.label}
		</button>
	{/each}
</div>

<!-- Charts -->
<div class="charts-grid">
	<div class="card">
		<div class="card-header">
			<h3 class="card-title">{tabData.yearlyTitle}</h3>
		</div>
		<div class="chart-wrapper">
			{#if tabData.yearly.length > 0}
				<canvas bind:this={barCanvas}></canvas>
			{:else}
				<div class="chart-empty">
					<p class="text-muted">Data belum tersedia</p>
				</div>
			{/if}
		</div>
	</div>

	<div class="card">
		<div class="card-header">
			<h3 class="card-title">{tabData.dailyTitle}</h3>
		</div>
		<div class="chart-wrapper">
			{#if tabData.daily.length > 0}
				<canvas bind:this={lineCanvas}></canvas>
			{:else}
				<div class="chart-empty">
					<p class="text-muted">Data belum tersedia</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.charts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
		gap: 20px;
	}

	.chart-wrapper {
		height: 320px;
		position: relative;
	}

	.chart-empty {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	@media (max-width: 960px) {
		.charts-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
