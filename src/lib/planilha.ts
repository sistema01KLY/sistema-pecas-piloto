import * as XLSX from 'xlsx';

export interface PlanilhaLida {
	headers: string[];
	headersNormalizados: string[];
	linhas: Record<string, string>[];
}

export function normalizarCabecalho(valor: string): string {
	return (valor ?? '')
		.toString()
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function detectarSeparador(texto: string): string {
	const primeiraLinha = texto.split(/\r?\n/)[0] ?? '';
	const ponto = (primeiraLinha.match(/;/g) ?? []).length;
	const virgula = (primeiraLinha.match(/,/g) ?? []).length;
	const tab = (primeiraLinha.match(/\t/g) ?? []).length;
	if (tab > ponto && tab > virgula) return '\t';
	return ponto >= virgula ? ';' : ',';
}

function parseCsv(texto: string): string[][] {
	const sep = detectarSeparador(texto);
	const linhas: string[][] = [];
	let campo = '';
	let linha: string[] = [];
	let dentroAspas = false;

	for (let i = 0; i < texto.length; i++) {
		const c = texto[i];
		if (dentroAspas) {
			if (c === '"') {
				if (texto[i + 1] === '"') {
					campo += '"';
					i++;
				} else dentroAspas = false;
			} else campo += c;
			continue;
		}
		if (c === '"') {
			dentroAspas = true;
		} else if (c === sep) {
			linha.push(campo);
			campo = '';
		} else if (c === '\n') {
			linha.push(campo);
			linhas.push(linha);
			linha = [];
			campo = '';
		} else if (c !== '\r') {
			campo += c;
		}
	}
	if (campo !== '' || linha.length > 0) {
		linha.push(campo);
		linhas.push(linha);
	}
	return linhas.filter((l) => l.some((c) => (c ?? '').trim() !== ''));
}

function montar(matriz: string[][]): PlanilhaLida {
	if (matriz.length === 0) return { headers: [], headersNormalizados: [], linhas: [] };
	const headers = (matriz[0] ?? []).map((h) => (h ?? '').toString().trim());
	const headersNormalizados = headers.map(normalizarCabecalho);
	const linhas = matriz.slice(1).map((linha) => {
		const obj: Record<string, string> = {};
		headersNormalizados.forEach((h, idx) => {
			if (!h) return;
			obj[h] = (linha[idx] ?? '').toString().trim();
		});
		return obj;
	});
	return { headers, headersNormalizados, linhas };
}

export async function lerPlanilha(file: File): Promise<PlanilhaLida> {
	const nome = file.name.toLowerCase();
	if (nome.endsWith('.csv') || nome.endsWith('.txt')) {
		const texto = (await file.text()).replace(/^\uFEFF/, '');
		return montar(parseCsv(texto));
	}
	const buffer = await file.arrayBuffer();
	const book = XLSX.read(buffer, { type: 'array', cellDates: false });
	const sheet = book.Sheets[book.SheetNames[0]];
	const matriz = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
	return montar(matriz.map((l) => (l ?? []).map((c) => (c ?? '').toString())));
}
