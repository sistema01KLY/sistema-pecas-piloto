import * as XLSX from 'xlsx';
import { timestampSuffix } from '@/lib/format';

/**
 * ⚠️ LAYOUTS RÍGIDOS — NÃO renomear, reordenar, remover ou acrescentar colunas.
 */

/** Layout exigido pelo sistema externo de geração dos EPCs. */
export const EPC_COLUMNS = [
	'referencia',
	'ean13',
	'nome',
	'grupo',
	'cor',
	'tamanho',
	'preco',
	'unidade',
	'extra1',
	'extra2',
	'extra3',
	'extra4',
	'extra5',
	'extra6',
	'extra7',
	'extra8',
	'extra9',
	'extra10',
	'extra11',
	'extra12',
	'extra13',
	'extra14',
	'extra15',
	'extra16',
	'extra17',
	'extra18',
	'extra19',
	'extra20',
	'dataExtra1',
	'dataExtra2',
	'quantidade',
] as const;

/** Layout exigido pelo ERP. */
export const ERP_COLUMNS = ['CODIGO_EPC', 'CODIGO_SKU', 'CODIGO_MIGRACAO', 'STATUS'] as const;

/** Colunas exatas do arquivo "Produto Iprint" (retorno dos EPCs). */
export const IPRINT_COLUMNS = [
  'EAN13',
  'EPC',
  'Descrição',
  'Cor',
  'Tamanho',
  'Tamanhos',
  'Situação',
  'Data Gerado',
  'extra 2',
] as const;

export interface EpcFileItem {
	referencia: string;
	ean13: string | null;
	nome: string | null;
	grupo: string | null;
	cor: string | null;
	tamanho: string | null;
	preco: number | string | null;
	unidade: string | null;
	quantidade: number;
}

/** Monta as linhas do arquivo EPC respeitando exatamente a ordem das colunas. */
export function buildEpcRows(items: EpcFileItem[]): string[][] {
	return items.map((item) => {
		const row: Record<string, string> = {};
		for (const col of EPC_COLUMNS) row[col] = '';
		row.referencia = item.referencia ?? '';
		row.ean13 = item.ean13 ?? '';
		row.nome = item.nome ?? '';
		row.grupo = item.grupo ?? '';
		row.cor = item.cor ?? '';
		row.tamanho = item.tamanho ?? '';
		row.preco = item.preco === null || item.preco === undefined ? '' : String(item.preco);
		row.unidade = item.unidade ?? '';
		row.extra1 = '';
		row.extra2 = 'PILOT';
		row.dataExtra1 = '';
		row.dataExtra2 = '';
		row.quantidade = String(item.quantidade);
		return EPC_COLUMNS.map((col) => row[col]);
	});
}

export interface ErpRow {
	epc: string;
	sku: string;
}

export function buildErpRows(rows: ErpRow[]): string[][] {
	return rows.map((r) => [r.epc, r.sku, '', 'EM ESTOQUE']);
}

function escapeCsv(value: string, sep: string): string {
	const v = value ?? '';
	if (v.includes(sep) || v.includes('"') || v.includes('\n') || v.includes('\r')) {
		return `"${v.replace(/"/g, '""')}"`;
	}
	return v;
}

export function toCsv(headers: readonly string[], rows: string[][], sep = ';'): string {
	const lines = [headers.map((h) => escapeCsv(h, sep)).join(sep)];
	for (const row of rows) lines.push(row.map((c) => escapeCsv(c ?? '', sep)).join(sep));
	return lines.join('\r\n');
}

export function downloadCsv(filename: string, headers: readonly string[], rows: string[][]): void {
	const content = '\uFEFF' + toCsv(headers, rows);
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function downloadXlsx(filename: string, headers: readonly string[], rows: string[][]): void {
	const sheet = XLSX.utils.aoa_to_sheet([[...headers], ...rows]);
	const book = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(book, sheet, 'Dados');
	XLSX.writeFile(book, filename);
}

export function epcFileName(numero: string): string {
	return `EPC_${numero}_${timestampSuffix()}`;
}

export function erpFileName(numero: string): string {
	return `ERP_${numero}_${timestampSuffix()}`;
}
