<script>
	import { onMount, onDestroy } from 'svelte';
	import flatpickr from 'flatpickr';
	import 'flatpickr/dist/flatpickr.min.css';
	import { CalendarDays, X } from '@lucide/svelte';

	let { dateStart = $bindable(''), dateEnd = $bindable(''), placeholder = 'Pilih Tanggal...', onchange = null } = $props();

	/** @type {HTMLInputElement} */
	let inputEl;
	/** @type {flatpickr.Instance} */
	let fp;

	onMount(() => {
		const initialDates = [];
		if (dateStart) initialDates.push(dateStart);
		if (dateEnd) initialDates.push(dateEnd);

		fp = flatpickr(inputEl, {
			mode: 'range',
			dateFormat: 'Y-m-d',
			defaultDate: initialDates,
			onClose: () => {
				if (onchange) onchange();
			},
			onChange: (selectedDates) => {
				if (selectedDates.length === 1) {
					dateStart = flatpickr.formatDate(selectedDates[0], 'Y-m-d');
					dateEnd = '';
				} else if (selectedDates.length === 2) {
					dateStart = flatpickr.formatDate(selectedDates[0], 'Y-m-d');
					dateEnd = flatpickr.formatDate(selectedDates[1], 'Y-m-d');
				} else {
					dateStart = '';
					dateEnd = '';
				}
			}
		});
	});

	onDestroy(() => {
		if (fp) fp.destroy();
	});

	// Handle external clear
	$effect(() => {
		if (fp && !dateStart && !dateEnd && fp.selectedDates.length > 0) {
			fp.clear();
		}
	});

	function clearDate() {
		dateStart = '';
		dateEnd = '';
		if (fp) fp.clear();
		if (onchange) onchange();
	}
</script>

<div class="date-picker-wrapper">
	<CalendarDays size={16} class="picker-icon" />
	<input type="text" class="form-input" bind:this={inputEl} {placeholder} />
	{#if dateStart}
		<button class="clear-btn" onclick={clearDate} title="Reset Tanggal">
			<X size={14} />
		</button>
	{/if}
</div>

<style>
	.date-picker-wrapper {
		position: relative;
		width: 100%;
	}
	.date-picker-wrapper :global(.picker-icon) {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-muted);
		pointer-events: none;
	}
	.form-input {
		padding-left: 36px; /* Space for icon */
		padding-right: 32px; /* Space for clear btn */
		background: var(--bg-card);
		width: 100%;
		box-sizing: border-box;
	}
	.clear-btn {
		position: absolute;
		right: 8px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}
	.clear-btn:hover {
		background: rgba(0,0,0,0.05);
		color: var(--text-main);
	}
</style>
