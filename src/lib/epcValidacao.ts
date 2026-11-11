import type { Tables } from '@/integrations/supabase/helpers';

export type RequestItem = Tables<'request_items'>;

export interface IprintRow {
	ean13: string;
	epc: string;
	referencia: string;
	descricao: string;
	cor: string;
	tamanho: string;
	tamanhos: string;
	situacao: string;
	linha: number;
}

export interface ResultadoValidacao {
	erros: string[];
	avisos: string[];
	/** epc -> request_item_id */
	vinculos: Map<string, string>;
	resumoPorItem: Array<{
		item: RequestItem;
		solicitado: number;
		recebido: number;
		ok: boolean;
	}>;
}

function norm(value: string | null | undefined): string {
	return (value ?? '').toString().trim().toUpperCase();
}

/**
 * Compara o retorno do sistema externo com a solicitação original.
 * Regra fundamental: qualquer divergência bloqueia a geração do arquivo ERP.
 */
export function validarRetornoEpcs(
	itens: RequestItem[],
	linhas: IprintRow[],
): ResultadoValidacao {
	const erros: string[] = [];
	const avisos: string[] = [];
	const vinculos = new Map<string, string>();

	if (linhas.length === 0) {
		erros.push('O arquivo não possui nenhum registro.');
	}

	// EPC vazio e duplicado
	const vistos = new Map<string, number>();
	const duplicados = new Set<string>();

	for (const l of linhas) {
		if (!l.epc) {
			erros.push(
				`ERRO: EPC vazio encontrado na linha ${l.linha}.`,
			);
			continue;
		}

		if (vistos.has(l.epc)) {
			duplicados.add(l.epc);
		} else {
			vistos.set(l.epc, l.linha);
		}
	}

	for (const epc of duplicados) {
		erros.push(
			`ERRO: EPC duplicado encontrado. EPC ${epc}.`,
		);
	}

	// Cada solicitação pode conter uma linha separada para o mesmo produto.
	// Agrupamos os itens por atributos do produto para validar o total em lote.
	const chaveProduto = (item: RequestItem) =>
		[
			norm(item.sku),
			norm(item.referencia),
			norm(item.cor),
			norm(item.tamanho),
		].join('|');
	const itensPorProduto = new Map<string, RequestItem[]>();
	for (const item of itens) {
		const chave = chaveProduto(item);
		itensPorProduto.set(chave, [...(itensPorProduto.get(chave) ?? []), item]);
	}

	// Valida os campos e identifica o produto correspondente a cada EPC.
	const contagem = new Map<string, number>();
	const linhasPorProduto = new Map<string, IprintRow[]>();

	for (const l of linhas) {
		if (!l.ean13) {
			erros.push(
				`ERRO: EAN13 vazio na linha ${l.linha} (EPC ${l.epc || 'vazio'}).`,
			);
			continue;
		}

		if (!l.referencia) {
			erros.push(
				`ERRO: Referência vazia na linha ${l.linha} (EPC ${l.epc || 'vazio'}).`,
			);
		}

		if (!l.descricao) {
			avisos.push(
				`Atenção: Descrição vazia na linha ${l.linha}.`,
			);
		}

		if (!l.cor) {
			erros.push(
				`ERRO: Cor vazia na linha ${l.linha} (EPC ${l.epc || 'vazio'}).`,
			);
		}

		if (!l.tamanho) {
			erros.push(
				`ERRO: Tamanho vazio na linha ${l.linha} (EPC ${l.epc || 'vazio'}).`,
			);
		}

		const candidatos = itens.filter(
			(i) => norm(i.ean13) === norm(l.ean13),
		);

		if (candidatos.length === 0) {
			erros.push(
				`ERRO: EPC ${l.epc || `linha ${l.linha}`} possui EAN13 ${l.ean13}, que não pertence a nenhum item das solicitações selecionadas.`,
			);
			continue;
		}

		const item = candidatos.find((i) =>
			norm(i.referencia) === norm(l.referencia) &&
			(!i.cor || !l.cor || norm(i.cor) === norm(l.cor)) &&
			(!i.tamanho || !l.tamanho || norm(i.tamanho) === norm(l.tamanho)),
		);

		if (!item) {
			const referenciaEsperada = candidatos[0].referencia;
			erros.push(
				`ERRO: EPC ${l.epc} possui referência ${l.referencia}, mas a solicitação esperava ${referenciaEsperada}.`,
			);
			continue;
		}

		const chave = chaveProduto(item);
		linhasPorProduto.set(chave, [...(linhasPorProduto.get(chave) ?? []), l]);
		contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
	}

	// Compara a quantidade total recebida com o total solicitado em todas
	// as solicitações selecionadas para cada produto.
	const recebidoPorItem = new Map<string, number>();
	for (const [chave, grupo] of itensPorProduto) {
		const solicitado = grupo.reduce((total, item) => total + item.quantidade, 0);
		const recebido = contagem.get(chave) ?? 0;
		const ok = recebido === solicitado;
		if (!ok) {
			const produto = grupo[0];
			erros.push(
				`ERRO: Divergência de quantidade no SKU ${produto.sku} (ref. ${produto.referencia}). Solicitado no total: ${solicitado} / Recebido: ${recebido}.`,
			);
		}

		// Distribui os EPCs pelas linhas individuais das solicitações, respeitando
		// a quantidade pedida em cada uma delas para manter os vínculos corretos.
		let indiceLinha = 0;
		for (const item of grupo) {
			let atribuidos = 0;
			while (indiceLinha < (linhasPorProduto.get(chave)?.length ?? 0) && atribuidos < item.quantidade) {
				const linha = linhasPorProduto.get(chave)![indiceLinha++];
				if (linha.epc) vinculos.set(linha.epc, item.id);
				atribuidos += 1;
			}
			recebidoPorItem.set(item.id, atribuidos);
		}
	}

	const resumoPorItem = itens.map((item) => {
		const recebido = recebidoPorItem.get(item.id) ?? 0;
		return {
			item,
			solicitado: item.quantidade,
			recebido,
			ok: recebido === item.quantidade,
		};
	});

	return {
		erros,
		avisos,
		vinculos,
		resumoPorItem,
	};
}
