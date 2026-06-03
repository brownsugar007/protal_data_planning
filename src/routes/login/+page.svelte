<script>
	import { enhance } from '$app/forms';
	import { Lock, User, HelpCircle, LogIn } from '@lucide/svelte';

	/** @type {{ form: any }} */
	let { form } = $props();

	let loading = $state(false);
</script>

<svelte:head>
	<title>Login — MGE Portal</title>
</svelte:head>

<div class="split-layout">
	<div class="split-left">
		<div class="overlay"></div>
		<div class="brand-content">
			<img src="/logo_mge.png" alt="MGE Logo" class="brand-logo" />
			<h1 class="brand-title">MGE PORTAL</h1>
			<p class="brand-tagline">
				Centralized Data Synchronization System:<br />
				Empowering Coal Mining Management, One Click at a Time.
			</p>
		</div>
	</div>

	<div class="split-right">
		<div class="login-wrapper">
			<img src="/logo_mge.png" alt="MGE Icon" class="form-logo" />
			<h2 class="form-title">Login</h2>
			<p class="form-subtitle">Log in to your account.</p>

			{#if form?.error}
				<div class="alert alert-danger">
					<span>⚠️</span>
					<span>{form.error}</span>
				</div>
			{/if}

			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}
			>
				<div class="form-group">
					<label for="username" class="form-label">Username</label>
					<input
						id="username"
						name="username"
						type="text"
						class="form-input"
						placeholder="Enter your username"
						value={form?.username ?? ''}
						required
						autocomplete="username"
					/>
				</div>

				<div class="form-group">
					<label for="password" class="form-label">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						class="form-input"
						placeholder="••••••••••"
						required
						autocomplete="current-password"
					/>
				</div>
				
				<div class="form-links">
					<button type="button" class="link-btn">Forgot Password?</button>
				</div>

				<button type="submit" class="btn btn-login" disabled={loading}>
					{#if loading}
						<span class="spinner"></span>
					{:else}
						Log In
					{/if}
				</button>
			</form>
			
			<div class="form-footer">
				<p>Don't have an account? <button type="button" class="link-btn">Sign Up</button></p>
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.split-layout {
		display: flex;
		min-height: 100vh;
		width: 100%;
		background-color: #ffffff;
	}

	/* Left Side */
	.split-left {
		flex: 1.2;
		position: relative;
		background-image: url('/coal_bg.png');
		background-size: cover;
		background-position: center;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding: 60px;
	}

	@media (max-width: 900px) {
		.split-left {
			display: none;
		}
	}

	.overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(30, 58, 95, 0.4) 0%, rgba(30, 58, 95, 0.9) 100%);
		z-index: 1;
	}

	.brand-content {
		position: relative;
		z-index: 2;
		color: #ffffff;
		max-width: 500px;
	}

	.brand-logo {
		height: 48px;
		object-fit: contain;
		margin-bottom: 20px;
		filter: brightness(0) invert(1);
	}

	.brand-title {
		font-size: 2.5rem;
		font-weight: 800;
		margin: 0 0 16px 0;
		letter-spacing: 1px;
	}

	.brand-tagline {
		font-size: 1.1rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.85);
		margin: 0;
	}

	/* Right Side */
	.split-right {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40px;
		background: #ffffff;
	}

	.login-wrapper {
		width: 100%;
		max-width: 380px;
	}

	.form-logo {
		height: 40px;
		object-fit: contain;
		margin-bottom: 24px;
	}

	.form-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: #111827;
		margin: 0 0 8px 0;
	}

	.form-subtitle {
		font-size: 0.95rem;
		color: #6b7280;
		margin: 0 0 32px 0;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #374151;
	}

	.form-input {
		width: 100%;
		padding: 12px 16px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 0.95rem;
		color: #111827;
		background: #ffffff;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.form-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-links {
		display: flex;
		justify-content: flex-end;
		margin-top: -8px;
	}

	.link-btn {
		background: none;
		border: none;
		color: #3b82f6;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
	}

	.link-btn:hover {
		text-decoration: underline;
	}

	.btn-login {
		width: 100%;
		padding: 12px;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
		display: flex;
		justify-content: center;
		align-items: center;
		height: 44px;
	}

	.btn-login:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-login:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.alert {
		padding: 12px 16px;
		border-radius: 8px;
		margin-bottom: 24px;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.alert-danger {
		background: #fef2f2;
		color: #991b1b;
		border: 1px solid #fecaca;
	}

	.form-footer {
		margin-top: 32px;
		text-align: center;
		font-size: 0.9rem;
		color: #6b7280;
	}
	
	.form-footer p {
		margin: 0;
	}
</style>
