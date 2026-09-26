import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';;
import { PageHeader } from '../components/Layout';
import { Alert, Button, Card, CardHeader, inputClass, Spinner } from '../components/ui';
import { lerPlanilha } from '../lib/planilha';
import { parseDecimal } from '../lib/format';

const COLUNAS_OBRIGATORIAS = ['referencia', 'sku'];
const ALIAS: Record<string, string> = {
  ref: 'referencia',
  referencia: 'referencia',
  codigo_sku: 'sku',
  sku: 'sku',
  ean: 'ean13',
  ean13: 'ean13',
  gtin: 'ean13',
  ean13_gtin: 'ean13',
  nome: 'nome',
  descricao: 'nome',
  grupo: 'grupo',
  colecao: 'colecao',
  cor: 'cor',
  tamanho: 'tamanho',
  preco: 'preco',
  unidade: 'unidade',
  un: 'unidade'
};

interface LinhaProcessada {
  linha: number;
  dados: {
    referencia: string;
    sku: string;
    ean13: string | null;
    nome: string | null;
    grupo: string | null;
    colecao: string | null;
    cor: string | null;
    tamanho: string | null;
    preco: number | null;
    unidade: string | null;
  };
  problemas: string[];
}

export default function ImportarProdutos() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [validas, setValidas] = useState<LinhaProcessada[]>([]);
  const [invalidas, setInvalidas] = useState<LinhaProcessada[]>([]);
  const [novos, setNovos] = useState(0);
  const [atualizados, setAtualizados] = useState(0);
  const [analisado, setAnalisado] = useState(false);

  const limpar = () => {
    setValidas([]);
    setInvalidas([]);
    setNovos(0);
    setAtualizados(0);
    setAnalisado(false);
    setSucesso(null);
    setErroGeral(null);
  };

  const analisar = async () => {
    if (!arquivo || !supabase) return;
    limpar();
    setAnalisando(true);
    try {
      const planilha = await lerPlanilha(arquivo);
      const mapa = new Map<string, string>();
      planilha.headersNormalizados.forEach((h) => {
        const destino = ALIAS[h];
        if (destino && !mapa.has(destino)) mapa.set(destino, h);
      });

      const faltantes = COLUNAS_OBRIGATORIAS.filter((c) => !mapa.has(c));
      if (faltantes.length > 0) {
        setErroGeral(`O arquivo não possui a(s) coluna(s) obrigatória(s): ${faltantes.join(', ')}.`);
        setAnalisando(false);
        return;
      }

      const get = (linha: Record<string, string>, campo: string): string => {
        const origem = mapa.get(campo);
        return origem ? (linha[origem] ?? '').trim() : '';
      };

      const skusNoArquivo = new Map<string, number>();
      const ok: LinhaProcessada[] = [];
      const ruins: LinhaProcessada[] = [];

      planilha.linhas.forEach((linha, idx) => {
        const numeroLinha = idx + 2;
        const referencia = get(linha, 'referencia');
        const sku = get(linha, 'sku');
        const ean13 = get(linha, 'ean13');
        const colecao = get(linha, 'colecao');
        const cor = get(linha, 'cor');
        const tamanho = get(linha, 'tamanho');
        const problemas: string[] = [];

        if (!referencia) problemas.push('Referência ausente');
        if (!sku) problemas.push('SKU ausente');
        if (!ean13) problemas.push('EAN13 ausente');
        if (!colecao) problemas.push('Coleção ausente');
        if (!cor) problemas.push('Cor ausente');
        if (!tamanho) problemas.push('Tamanho ausente');
        if (sku) {
          const anterior = skusNoArquivo.get(sku);
          if (anterior) problemas.push(`SKU duplicado no arquivo (também na linha ${anterior})`);else
          skusNoArquivo.set(sku, numeroLinha);
        }

        const registro: LinhaProcessada = {
          linha: numeroLinha,
          dados: {
            referencia,
            sku,
            ean13: ean13 || null,
            nome: get(linha, 'nome') || null,
            grupo: get(linha, 'grupo') || null,
            colecao: colecao || null,
            cor: cor || null,
            tamanho: tamanho || null,
            preco: parseDecimal(get(linha, 'preco')),
            unidade: get(linha, 'unidade') || null
          },
          problemas
        };
        if (problemas.length > 0) ruins.push(registro);else
        ok.push(registro);
      });

      // Verifica quais SKUs já existem na base
      let existentes = 0;
      const skus = ok.map((l) => l.dados.sku);
      for (let i = 0; i < skus.length; i += 200) {
        const lote = skus.slice(i, i + 200);
        const { data } = await supabase.from('products').select('sku').in('sku', lote);
        existentes += (data ?? []).length;
      }

      setValidas(ok);
      setInvalidas(ruins);
      setAtualizados(existentes);
      setNovos(ok.length - existentes);
      setAnalisado(true);
    } catch (e) {
      setErroGeral(`Não foi possível ler o arquivo: ${(e as Error).message}`);
    }
    setAnalisando(false);
  };

  const confirmar = async () => {
    if (!supabase || validas.length === 0) return;
    const confirmado = window.confirm(
      `Confirma a importação de ${validas.length} produto(s)?\n\nNovos: ${novos}\nAtualizados: ${atualizados}\n\nA base anterior NÃO será excluída. Registros existentes com o mesmo SKU serão atualizados.`
    );
    if (!confirmado) return;
    setImportando(true);
    setErroGeral(null);
    const registros = validas.map((l) => ({ ...l.dados, ativo: true }));
    for (let i = 0; i < registros.length; i += 200) {
      const lote = registros.slice(i, i + 200);
      const { error } = await supabase.from('products').upsert(lote, { onConflict: 'sku' });
      if (error) {
        setErroGeral(`Erro ao importar: ${error.message}`);
        setImportando(false);
        return;
      }
    }
    setImportando(false);
    setSucesso(`Importação concluída. ${novos} produto(s) incluído(s) e ${atualizados} atualizado(s).`);
    setValidas([]);
    setInvalidas([]);
    setAnalisado(false);
  };

  return (
    <div data-ev-id="ev_fc7e9a033e" className="flex flex-col gap-4">
			<PageHeader
        titulo="Importar Base de Produtos"
        descricao="Envie um arquivo Excel ou CSV. Nada é gravado antes da sua confirmação."
        acoes={
        <Link data-ev-id="ev_1f88dbc57b" to="/produtos">
						<Button variant="outline">
							<ArrowLeft className="h-4 w-4" /> Voltar
						</Button>
					</Link>
        } />


			{erroGeral ? <Alert tipo="erro" titulo="Não foi possível processar">{erroGeral}</Alert> : null}
			{sucesso ? <Alert tipo="sucesso">{sucesso}</Alert> : null}

			<Card>
				<CardHeader titulo="1. Selecionar arquivo" descricao="Colunas aceitas: referencia, sku, ean13, nome, grupo, colecao, cor, tamanho, preco, unidade." />
				<div data-ev-id="ev_25b5689d6b" className="flex flex-col gap-4 px-5 py-4">
					<input data-ev-id="ev_4066523370"
          type="file"
          accept=".csv,.txt,.xlsx,.xls"
          className={inputClass}
          onChange={(e) => {
            setArquivo(e.target.files?.[0] ?? null);
            limpar();
          }} />

					<div data-ev-id="ev_d35db675af">
						<Button onClick={analisar} disabled={!arquivo} loading={analisando}>
							<FileSpreadsheet className="h-4 w-4" /> Analisar arquivo
						</Button>
					</div>
				</div>
			</Card>

			{analisando ? <Spinner texto="Analisando arquivo..." /> : null}

			{analisado ?
      <Card>
					<CardHeader titulo="2. Resumo da importação" descricao="Revise os números antes de confirmar." />
					<div data-ev-id="ev_8466f92e1b" className="grid grid-cols-2 gap-4 px-5 py-4 md:grid-cols-4">
						<Resumo titulo="Linhas válidas" valor={validas.length} cor="text-green-700" />
						<Resumo titulo="Linhas inválidas" valor={invalidas.length} cor="text-red-700" />
						<Resumo titulo="Novos produtos" valor={novos} cor="text-slate-900" />
						<Resumo titulo="Produtos atualizados" valor={atualizados} cor="text-slate-900" />
					</div>

					{invalidas.length > 0 ?
        <div data-ev-id="ev_4fa2ac5eee" className="flex flex-col gap-2 border-t border-border px-5 py-4">
							<Alert tipo="aviso" titulo="Linhas inválidas serão ignoradas">
								Corrija o arquivo e importe novamente para incluir estes registros.
							</Alert>
							<div data-ev-id="ev_6fa76d3c82" className="max-h-72 overflow-auto rounded-md border border-border">
								<table data-ev-id="ev_b3a9791308" className="w-full text-sm">
									<thead data-ev-id="ev_17141ce1fb" className="bg-muted text-left text-xs uppercase text-muted-foreground">
										<tr data-ev-id="ev_5310ccee5f">
											<th data-ev-id="ev_497622de12" className="px-3 py-2">Linha</th>
											<th data-ev-id="ev_bf2a7fa79b" className="px-3 py-2">Referência</th>
											<th data-ev-id="ev_528f75cf55" className="px-3 py-2">SKU</th>
											<th data-ev-id="ev_f0fe73d04f" className="px-3 py-2">Problemas</th>
										</tr>
									</thead>
									<tbody data-ev-id="ev_98488ca25b" className="divide-y divide-border">
										{invalidas.map((l) =>
                <tr data-ev-id="ev_5273f3ac2d" key={l.linha}>
												<td data-ev-id="ev_f0db5c9fd5" className="px-3 py-2">{l.linha}</td>
												<td data-ev-id="ev_002d5c37ef" className="px-3 py-2">{l.dados.referencia || '-'}</td>
												<td data-ev-id="ev_f20a947732" className="px-3 py-2">{l.dados.sku || '-'}</td>
												<td data-ev-id="ev_38e23cda20" className="px-3 py-2 text-red-700">{l.problemas.join('; ')}</td>
											</tr>
                )}
									</tbody>
								</table>
							</div>
						</div> :
        null}

					<div data-ev-id="ev_41e9aaf432" className="flex flex-row justify-end gap-2 border-t border-border px-5 py-4">
						<Button variant="outline" onClick={limpar}>
							Cancelar
						</Button>
						<Button onClick={confirmar} disabled={validas.length === 0} loading={importando}>
							Confirmar importação
						</Button>
					</div>
				</Card> :
      null}
		</div>);

}

function Resumo({ titulo, valor, cor }: {titulo: string;valor: number;cor: string;}) {
  return (
    <div data-ev-id="ev_0746ff7b54" className="flex flex-col gap-1 rounded-md border border-border px-4 py-3">
			<span data-ev-id="ev_ce9f39e544" className="text-xs uppercase text-muted-foreground">{titulo}</span>
			<span data-ev-id="ev_cc352aa6b1" className={`text-2xl font-semibold ${cor}`}>{valor}</span>
		</div>);

}