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
 * Apenas linhas válidas recebem vínculo para importação; erros ficam detalhados para revisão.
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

		const chaveEpc = norm(l.epc);
		if (vistos.has(chaveEpc)) {
			duplicados.add(chaveEpc);
		} else {
			vistos.set(chaveEpc, l.linha);
		}
	}

	for (const epc of duplicados) {
		erros.push(
			`ERRO: EPC duplicado encontrado. EPC ${epc}.`,
		);
	}

	// Agrupa os itens por produto para validar o total solicitado entre várias solicitações.
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

	const quantidadeRestantePorItem = new Map(
		itens.map((item) => [item.id, item.quantidade]),
	);
	const recebidoPorProduto = new Map<string, number>();
	const recebidoPorItem = new Map<string, number>();

	for (const l of linhas) {
		if (!l.epc || duplicados.has(norm(l.epc))) continue;

		if (!l.ean13) {
			erros.push(
				`ERRO: EAN13 vazio na linha ${l.linha} (EPC ${l.epc}).`,
			);
			continue;
		}

		if (!l.descricao) {
			avisos.push(`Atenção: Descrição vazia na linha ${l.linha}.`);
		}

		if (!l.referencia) {
			erros.push(`ERRO: Referência vazia na linha ${l.linha} (EPC ${l.epc}).`);
		}
		if (!l.cor) {
			erros.push(`ERRO: Cor vazia na linha ${l.linha} (EPC ${l.epc}).`);
		}
		if (!l.tamanho) {
			erros.push(`ERRO: Tamanho vazio na linha ${l.linha} (EPC ${l.epc}).`);
		}
		if (!l.referencia || !l.cor || !l.tamanho) continue;

		const candidatos = itens.filter((item) => norm(item.ean13) === norm(l.ean13));
		if (candidatos.length === 0) {
			erros.push(
				`ERRO: EPC ${l.epc} possui EAN13 ${l.ean13}, que não pertence a nenhum item das solicitações selecionadas.`,
			);
			continue;
		}

		const correspondentes = candidatos.filter(
			(item) =>
				norm(item.referencia) === norm(l.referencia) &&
				(!item.cor || norm(item.cor) === norm(l.cor)) &&
				(!item.tamanho || norm(item.tamanho) === norm(l.tamanho)),
		);
		if (correspondentes.length === 0) {
			const referenciaEsperada = candidatos[0].referencia;
			erros.push(
				`ERRO: EPC ${l.epc} possui referência ${l.referencia}, mas a solicitação esperava ${referenciaEsperada}.`,
			);
			continue;
		}

		const chave = chaveProduto(correspondentes[0]);
		recebidoPorProduto.set(chave, (recebidoPorProduto.get(chave) ?? 0) + 1);

		const itemParaVinculo = correspondentes.find(
			(item) => (quantidadeRestantePorItem.get(item.id) ?? 0) > 0,
		);
		if (itemParaVinculo) {
			vinculos.set(l.epc, itemParaVinculo.id);
			quantidadeRestantePorItem.set(
				itemParaVinculo.id,
				(quantidadeRestantePorItem.get(itemParaVinculo.id) ?? 0) - 1,
			);
			recebidoPorItem.set(
				itemParaVinculo.id,
				(recebidoPorItem.get(itemParaVinculo.id) ?? 0) + 1,
			);
		}
	}

	for (const [chave, grupo] of itensPorProduto) {
		const solicitado = grupo.reduce((total, item) => total + item.quantidade, 0);
		const recebido = recebidoPorProduto.get(chave) ?? 0;
		if (recebido !== solicitado) {
			erros.push(
				`ERRO: Divergência de quantidade no SKU ${grupo[0].sku} (ref. ${grupo[0].referencia}). Solicitado no total: ${solicitado} / Recebido: ${recebido}.`,
			);
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
