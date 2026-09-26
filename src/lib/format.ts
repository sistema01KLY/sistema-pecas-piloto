export function formatDateTime(value?: string | null): string {
	if (!value) return '-';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '-';
	return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(value?: string | null): string {
	if (!value) return '-';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '-';
	return d.toLocaleDateString('pt-BR');
}

export function formatNumber(value?: number | null): string {
	if (value === null || value === undefined) return '0';
	return value.toLocaleString('pt-BR');
}

export function formatCurrency(value?: number | string | null): string {
	const n = typeof value === 'string' ? Number(value) : value;
	if (n === null || n === undefined || Number.isNaN(n)) return '-';
	return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Converte "1.234,56" ou "1234.56" em número. */
export function parseDecimal(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value === 'number') return Number.isNaN(value) ? null : value;
	const raw = String(value).trim().replace(/[^\d,.-]/g, '');
	if (!raw) return null;
	const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
	const n = Number(normalized);
	return Number.isNaN(n) ? null : n;
}

export function timestampSuffix(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
