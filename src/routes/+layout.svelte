<script>
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Toast from '$lib/components/Toast.svelte';

	/** @type {{ data: { user: any } }} */
	let { data, children } = $props();
</script>

<Toast />

{#if data.user}
	<div class="app-layout">
		<Sidebar />
		<main class="main-content">
			{@render children()}
		</main>
	</div>
{:else}
	{@render children()}
{/if}
