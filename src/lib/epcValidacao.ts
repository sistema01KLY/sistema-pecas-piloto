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

	// Vincula cada registro ao item solicitado pelo EAN13
	// e valida os demais campos
	const contagem = new Map<string, number>();

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

		const item = itens.find(
			(i) => norm(i.ean13) === norm(l.ean13),
		);

		if (!item) {
			erros.push(
				`ERRO: EPC ${l.epc || `linha ${l.linha}`} possui EAN13 ${l.ean13}, que não pertence a nenhum item desta solicitação.`,
			);
			continue;
		}

		if (norm(item.referencia) !== norm(l.referencia)) {
			erros.push(
				`ERRO: EPC ${l.epc} pertence à referência ${l.referencia}, mas a solicitação esperava a referência ${item.referencia}.`,
			);
			continue;
		}

		if (
			item.cor &&
			l.cor &&
			norm(item.cor) !== norm(l.cor)
		) {
			erros.push(
				`ERRO: EPC ${l.epc} possui cor ${l.cor}, mas a solicitação esperava a cor ${item.cor}.`,
			);
			continue;
		}

		if (
			item.tamanho &&
			l.tamanho &&
			norm(item.tamanho) !== norm(l.tamanho)
		) {
			erros.push(
				`ERRO: EPC ${l.epc} possui tamanho ${l.tamanho}, mas a solicitação esperava o tamanho ${item.tamanho}.`,
			);
			continue;
		}

		if (l.epc) {
			vinculos.set(l.epc, item.id);
		}

		contagem.set(
			item.id,
			(contagem.get(item.id) ?? 0) + 1,
		);
	}

	// Validação de quantidade:
	// solicitado deve ser exatamente igual ao recebido
	const resumoPorItem = itens.map((item) => {
		const recebido = contagem.get(item.id) ?? 0;
		const ok = recebido === item.quantidade;

		if (!ok) {
			erros.push(
				`ERRO: Divergência de quantidade no SKU ${item.sku} (ref. ${item.referencia}). Solicitado: ${item.quantidade} / Recebido: ${recebido}.`,
			);
		}

		return {
			item,
			solicitado: item.quantidade,
			recebido,
			ok,
		};
	});

	return {
		erros,
		avisos,
		vinculos,
		resumoPorItem,
	};
}