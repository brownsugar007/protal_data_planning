<script>
	import { page } from '$app/stores';
	import { LayoutDashboard, Truck, Construction, FileText, Fuel, LogOut, ChevronLeft, Menu } from '@lucide/svelte';

	let collapsed = $state(false);

	const navItems = [
		{ href: '/', label: 'Dashboard Utama', icon: LayoutDashboard },
		{ href: '/hauling', label: 'Modul Coal Hauling', icon: Truck },
		{ href: '/ob', label: 'Modul Overburden', icon: Construction },
		{ href: '/ms', label: 'Modul MS Kontrak', icon: FileText },
		{ href: '/fuel', label: 'Modul Fuel', icon: Fuel }
	];

	function isActive(href, pathname) {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}

	$effect(() => {
		if (typeof document !== 'undefined') {
			if (collapsed) {
				document.body.classList.add('sidebar-collapsed');
			} else {
				document.body.classList.remove('sidebar-collapsed');
			}
		}
	});

	async function handleLogout() {
		await fetch('/api/logout', { method: 'POST' });
		window.location.href = '/login';
	}
</script>

<aside class="sidebar" class:collapsed>
	<div class="sidebar-header">
		{#if !collapsed}
			<img src="/logo_mge.png" alt="MGE" class="sidebar-logo" />
		{/if}
		<button class="toggle-btn" onclick={() => collapsed = !collapsed} aria-label="Toggle sidebar">
			{#if collapsed}
				<Menu size={20} />
			{:else}
				<ChevronLeft size={20} />
			{/if}
		</button>
	</div>

	{#if !collapsed}
		<div class="sidebar-user">
			<div class="user-avatar">AP</div>
			<div class="user-info">
				<span class="user-name">Admin Planning</span>
				<span class="user-role">Administrator</span>
			</div>
		</div>
	{/if}

	<nav class="sidebar-nav">
		{#each navItems as item}
			<a
				href={item.href}
				class="nav-item"
				class:active={isActive(item.href, $page.url.pathname)}
				title={collapsed ? item.label : ''}
			>
				<span class="nav-icon">
					<item.icon size={20} />
				</span>
				{#if !collapsed}
					<span class="nav-label">{item.label}</span>
				{/if}
				{#if isActive(item.href, $page.url.pathname)}
					<span class="active-indicator"></span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="sidebar-footer">
		<button class="logout-btn" onclick={handleLogout} title={collapsed ? 'Logout' : ''}>
			<LogOut size={18} />
			{#if !collapsed}
				<span>Logout</span>
			{/if}
		</button>
	</div>
</aside>

<style>
	.sidebar {
		position: fixed; top: 0; left: 0; width: var(--sidebar-width); height: 100vh;
		background: var(--bg-card);
		border-right: 1px solid var(--border-subtle); display: flex; flex-direction: column;
		z-index: 100; transition: width var(--transition-normal); overflow: hidden;
	}
	.sidebar.collapsed { width: 72px; }
	.sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 16px; border-bottom: 1px solid var(--border-subtle); min-height: 72px; }
	.sidebar-logo { height: 36px; object-fit: contain; }
	.toggle-btn { background: transparent; border: 1px solid var(--border-default); border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; transition: all var(--transition-fast); flex-shrink: 0; }
	.toggle-btn:hover { background: var(--bg-card); color: var(--text-primary); border-color: var(--accent-primary); }
	.sidebar-user { display: flex; align-items: center; gap: 12px; padding: 20px 16px; border-bottom: 1px solid var(--border-subtle); }
	.user-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; color: white; flex-shrink: 0; }
	.user-info { display: flex; flex-direction: column; min-width: 0; }
	.user-name { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; }
	.user-role { font-size: 0.75rem; color: var(--text-muted); }
	.sidebar-nav { flex: 1; padding: 12px 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
	.nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 12px; border-radius: var(--radius-md); color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; text-decoration: none; transition: all var(--transition-fast); position: relative; white-space: nowrap; overflow: hidden; }
	.nav-item:hover { background: rgba(14, 165, 233, 0.08); color: var(--text-primary); }
	.nav-item.active { background: rgba(14, 165, 233, 0.12); color: var(--accent-primary); font-weight: 700; }
	.nav-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 24px; height: 24px; }
	.nav-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.active-indicator { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 24px; background: var(--accent-gradient); border-radius: 0 3px 3px 0; }
	.sidebar-footer { padding: 16px; border-top: 1px solid var(--border-subtle); }
	.logout-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 10px; background: transparent; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); color: #f87171; font-family: inherit; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
	.logout-btn:hover { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.5); }
	@media (max-width: 768px) { .sidebar { transform: translateX(-100%); } .sidebar.collapsed { transform: translateX(-100%); } }
</style>
