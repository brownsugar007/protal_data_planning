import { writable } from 'svelte/store';

/** @type {import('svelte/store').Writable<{username: string, role: string} | null>} */
export const user = writable(null);

/** @type {import('svelte/store').Writable<Array<{id: number, type: string, message: string}>>} */
export const toasts = writable([]);

let toastId = 0;

/**
 * Show a toast notification.
 * @param {string} message 
 * @param {'success' | 'error' | 'info'} [type='info']
 * @param {number} [duration=4000]
 */
export function showToast(message, type = 'info', duration = 4000) {
	const id = ++toastId;
	toasts.update(t => [...t, { id, type, message }]);
	setTimeout(() => {
		toasts.update(t => t.filter(toast => toast.id !== id));
	}, duration);
}
