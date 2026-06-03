/**
 * Format a number with thousand separators and decimal places.
 * @param {number | string | null | undefined} value
 * @param {number} [decimals=0]
 * @returns {string}
 */
export function formatNumber(value, decimals = 0) {
	if (value === null || value === undefined || value === '') return '-';
	const num = typeof value === 'string' ? parseFloat(value) : value;
	if (isNaN(num)) return '-';
	return num.toLocaleString('id-ID', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

/**
 * Format a date string to DD/MM/YYYY.
 * @param {string | null | undefined} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
	if (!dateStr) return '-';
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return dateStr;
	return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Format a date string to DD MMM YYYY.
 * @param {string | null | undefined} dateStr
 * @returns {string}
 */
export function formatDateLong(dateStr) {
	if (!dateStr) return 'Belum Tersedia';
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return dateStr;
	return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Format bytes to human-readable size.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Abbreviate a number (e.g. 1500 -> 1.5K).
 * @param {number} num
 * @returns {string}
 */
export function abbreviateNumber(num) {
	if (num === null || num === undefined) return '-';
	if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
	if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
	if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(1) + 'K';
	return num.toFixed(0);
}
