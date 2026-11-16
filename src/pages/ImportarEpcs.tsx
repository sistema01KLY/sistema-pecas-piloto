import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/Layout';
import { Alert, Button, Card, CardHeader, Empty, inputClass, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/StatusBadge';
import type { RequestStatus } from '@/lib/status';
import { lerPlanilha, normalizarCabecalho } from '@/lib/planilha';
import { validarRetornoEpcs, type IprintRow } from '@/lib/epcValidacao';
import { registrarHistorico } from '@/lib/historico';
import { IPRINT_COLUMNS } from '@/lib/fileLayouts';

type Request = Tables<'requests'>;
type RequestItem = Tables<'request_items'>;

export default function ImportarEpcs() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestIdParam = searchParams.get('request');

  const [solicitacoes, setSolicitacoes] = useState<Request[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>(requestIdParam ? [requestIdParam] : []);
  const [itens, setItens] = useState<RequestItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [linhas, setLinhas] = useState<IprintRow[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [analisado, setAnalisado] = useState(false);
  const [importacaoConcluida, setImportacaoConcluida] = useState(false);
  const [vinculos, setVinculos] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const carregar = async () => {
      if (!supabase) return;
      const { data } = await supabase.
      from('requests').
      select('*').
      in('status', ['ARQUIVO_EPC_GERADO', 'EM_PROCESSAMENTO', 'SOLICITADA']).
      order('created_at', { ascending: false });
      setSolicitacoes(data ?? []);
      setCarregando(false);
    };
    void carregar();
  }, []);

  useEffect(() => {
    const carregar = async () => {
      if (!supabase || selecionadas.length === 0) {setItens([]);return;}
      const { data } = await supabase.from('request_items').select('*').in('request_id', selecionadas);
      setItens(data ?? []);
    };
    void carregar();
  }, [selecionadas]);

  const limpar = () => {
    setLinhas([]);
    setErros([]);
    setAvisos([]);
    setAnalisado(false);
    setImportacaoConcluida(false);
    setSucesso(null);
    setVinculos(new Map());
  };

  const analisar = async () => {
    if (!arquivo || itens.length === 0) return;
    limpar();
    setAnalisando(true);
    try {
      const planilha = await lerPlanilha(arquivo);
      const esperadas = IPRINT_COLUMNS.map(normalizarCabecalho);
      const faltantes = esperadas.filter((e) => !planilha.headersNormalizados.includes(e));
      if (faltantes.length > 0) {
        setErros([`O arquivo não possui a(s) coluna(s): ${faltantes.join(', ')}.`]);
        setAnalisando(false);
        return;
      }
      const mapa = new Map<string, string>();
      planilha.headersNormalizados.forEach((h, idx) => mapa.set(h, planilha.headers[idx]));
      const get = (linha: Record<string, string>, col: string): string => linha[normalizarCabecalho(col)] ?? '';

      const parsed: IprintRow[] = planilha.linhas.map((l, idx) => ({
      ean13: get(l, 'EAN13').trim(),
      epc: get(l, 'EPC').trim(),
      referencia: get(l, 'Referência').trim(),
      descricao: get(l, 'Descrição').trim(),
      cor: get(l, 'Cor').trim(),
      tamanho: get(l, 'Tamanho').trim(),
      tamanhos: get(l, 'Tamanhos').trim(),
      situacao: get(l, 'Situação').trim(),
      linha: idx + 2
    }));
      setLinhas(parsed);
      const resultado = validarRetornoEpcs(itens, parsed);
      setErros(resultado.erros);
      setAvisos(resultado.avisos);
      setVinculos(resultado.vinculos);
      setAnalisado(true);
    } catch (e) {
      setErros([`Não foi possível ler o arquivo: ${(e as Error).message}`]);
    }
    setAnalisando(false);
  };

  const confirmar = async () => {
    if (!supabase || !user || vinculos.size === 0 || importacaoConcluida) return;
    const client = supabase;

    const registrosValidados = linhas
      .filter((linha) => Boolean(linha.epc) && vinculos.has(linha.epc))
      .map((linha) => ({
        request_item_id: vinculos.get(linha.epc)!,
        ean13: linha.ean13 || null,
        epc: linha.epc,
        descricao: linha.descricao || null,
        cor: linha.cor || null,
        tamanho: linha.tamanho || null,
        tamanhos: linha.tamanhos || null,
        situacao: linha.situacao || null,
      }));

    if (registrosValidados.length === 0) return;

    const linhasIgnoradas = linhas.length - registrosValidados.length;
    const confirmado = window.confirm(
      `Serão importados ${registrosValidados.length} EPC(s) válido(s). ${linhasIgnoradas} linha(s) com erro ou sem vínculo serão ignoradas. Deseja continuar?`,
    );
    if (!confirmado) return;

    setImportando(true);
    const normalizarEpc = (epc: string) => epc.trim().toLocaleUpperCase();
    const epcsNoBanco = new Set<string>();

    for (let indice = 0; indice < registrosValidados.length; indice += 500) {
      const lote = registrosValidados.slice(indice, indice + 500).map((registro) => registro.epc);
      const { data: existentes, error: consultaErro } = await supabase
        .from('epcs')
        .select('epc')
        .in('epc', lote);

      if (consultaErro) {
        setErros((atuais) => [...atuais, `Não foi possível verificar EPCs já importados: ${consultaErro.message}`]);
        setImportando(false);
        return;
      }

      (existentes ?? []).forEach((registro) => epcsNoBanco.add(normalizarEpc(registro.epc)));
    }

    const registrosNovos = registrosValidados.filter(
      (registro) => !epcsNoBanco.has(normalizarEpc(registro.epc)),
    );
    const duplicadosNoBanco = registrosValidados.length - registrosNovos.length;

    if (duplicadosNoBanco > 0) {
      setErros((atuais) => [
        ...atuais,
        `${duplicadosNoBanco} EPC(s) já cadastrado(s) foram ignorados.`,
      ]);
    }

    if (registrosNovos.length === 0) {
      setErros((atuais) => [
        ...atuais,
        'Nenhum EPC novo para importar; os EPCs válidos já estão cadastrados.',
      ]);
      setImportacaoConcluida(true);
      setImportando(false);
      return;
    }

    const { error: erroInsercao } = await supabase.from('epcs').insert(registrosNovos);
    if (erroInsercao) {
      setErros((atuais) => [...atuais, `Erro ao inserir EPCs: ${erroInsercao.message}`]);
      setImportando(false);
      return;
    }

    const contagensPorItem = new Map<string, number>();
    let erroConsultaStatus = false;

    for (let indice = 0; indice < itens.length; indice += 20) {
      const loteItens = itens.slice(indice, indice + 20);
      const resultados = await Promise.all(loteItens.map(async (item) => {
        const { count, error: erroContagem } = await client
          .from('epcs')
          .select('epc', { count: 'exact', head: true })
          .eq('request_item_id', item.id);
        return { itemId: item.id, count, error: erroContagem };
      }));

      resultados.forEach((resultado) => {
        if (resultado.error) {
          erroConsultaStatus = true;
        } else {
          contagensPorItem.set(resultado.itemId, resultado.count ?? 0);
        }
      });
    }

    const statusPorSolicitacao = new Map<string, 'EPCS_RECEBIDOS' | 'EM_PROCESSAMENTO'>();
    const avisosStatus: string[] = [];

    if (erroConsultaStatus) {
      avisosStatus.push('Os EPCs foram importados, mas não foi possível conferir todos os quantitativos para atualizar os status.');
    } else {
      selecionadas.forEach((requestId) => {
        const itensDaSolicitacao = itens.filter((item) => item.request_id === requestId);
        if (itensDaSolicitacao.length === 0) return;

        const todosRecebidos = itensDaSolicitacao.every(
          (item) => (contagensPorItem.get(item.id) ?? 0) >= item.quantidade,
        );
        statusPorSolicitacao.set(
          requestId,
          todosRecebidos ? 'EPCS_RECEBIDOS' : 'EM_PROCESSAMENTO',
        );
      });

      for (const status of ['EPCS_RECEBIDOS', 'EM_PROCESSAMENTO'] as const) {
        const ids = [...statusPorSolicitacao.entries()]
          .filter(([, statusSolicitacao]) => statusSolicitacao === status)
          .map(([requestId]) => requestId);
        if (ids.length === 0) continue;

        const { error: erroAtualizacao } = await supabase
          .from('requests')
          .update({ status })
          .in('id', ids);
        if (erroAtualizacao) {
          avisosStatus.push(`Não foi possível atualizar o status para ${status}: ${erroAtualizacao.message}`);
        }
      }
    }

    const solicitacaoPorItem = new Map(itens.map((item) => [item.id, item.request_id]));
    const importadosPorSolicitacao = new Map<string, number>();
    registrosNovos.forEach((registro) => {
      const requestId = solicitacaoPorItem.get(registro.request_item_id);
      if (requestId) {
        importadosPorSolicitacao.set(
          requestId,
          (importadosPorSolicitacao.get(requestId) ?? 0) + 1,
        );
      }
    });

    await Promise.all(
      [...importadosPorSolicitacao.entries()].map(([requestId, quantidade]) =>
        registrarHistorico(
          requestId,
          user.id,
          'EPCs importados',
          `${quantidade} EPC(s) válido(s) importado(s) em lote.`,
        ),
      ),
    );

    if (avisosStatus.length > 0) {
      setAvisos((atuais) => [...atuais, ...avisosStatus]);
    }

    const linhasNaoImportadas = linhas.length - registrosNovos.length;
    setImportacaoConcluida(true);
    setImportando(false);
    setSucesso(
      `Importação concluída: ${registrosNovos.length} EPC(s) importado(s). ${linhasNaoImportadas} linha(s) com erro, sem vínculo ou já cadastradas foram ignoradas.`,
    );
  };

  const solsSelecionadas = solicitacoes.filter((s) => selecionadas.includes(s.id));
  const selectAllRef = useRef<HTMLInputElement>(null);
  const quantidadeSelecionadasVisiveis = solicitacoes.filter((solicitacao) => selecionadas.includes(solicitacao.id)).length;
  const todasSelecionadas = solicitacoes.length > 0 && quantidadeSelecionadasVisiveis === solicitacoes.length;
  const algumasSelecionadas = quantidadeSelecionadasVisiveis > 0 && !todasSelecionadas;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = algumasSelecionadas;
    }
  }, [algumasSelecionadas]);

  return (
    <div data-ev-id="ev_91e4fdfce7" className="flex flex-col gap-4">
			<PageHeader
        titulo="Importar EPCs"
        descricao="Carregue o arquivo Produto Iprint exportado pelo sistema externo."
        acoes={
        <Link data-ev-id="ev_545eab1f7d" to="/solicitacoes">
						<Button variant="outline"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
					</Link>
        } />


			{sucesso ? <Alert tipo="sucesso">{sucesso}</Alert> : null}

			<Card>
				<CardHeader titulo="1. Selecionar solicitações" descricao="Selecione uma ou várias solicitações para importar os EPCs em lote." />
				<div data-ev-id="ev_27b9e3baf2" className="px-5 py-4">
					{carregando ? <Spinner /> :
          <>
            <label className="mb-3 flex cursor-pointer items-center gap-2 px-1 text-sm font-medium text-foreground">
              <input
                ref={selectAllRef}
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={todasSelecionadas}
                disabled={solicitacoes.length === 0}
                aria-label="Selecionar todas as solicitações listadas"
                onChange={(event) => {
                  setSelecionadas(event.target.checked ? solicitacoes.map((solicitacao) => solicitacao.id) : []);
                  limpar();
                }}
              />
              <span>Selecionar todas as solicitações ({solicitacoes.length})</span>
            </label>
            <div className="grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
              {solicitacoes.map((s) => <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50">
                <input type="checkbox" checked={selecionadas.includes(s.id)} onChange={(e) => {setSelecionadas((atual) => e.target.checked ? [...atual, s.id] : atual.filter((id) => id !== s.id)); limpar();}} />
                <span className="flex-1">{s.numero}</span><StatusBadge status={s.status} />
              </label>)}
            </div>
          </>
          }
          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
            <span>{selecionadas.length} solicitação(ões) selecionada(s)</span><span>{itens.length} item(ns)</span>
          </div>
				</div>
			</Card>

			{selecionadas.length > 0 ?
      <Card>
					<CardHeader titulo="2. Carregar arquivo Produto Iprint" descricao={`Um único arquivo pode conter os EPCs das solicitações selecionadas. Colunas esperadas: ${IPRINT_COLUMNS.join(', ')}`} />
					<div data-ev-id="ev_1fdf0d187f" className="flex flex-col gap-4 px-5 py-4">
						<input data-ev-id="ev_f041200da5" type="file" accept=".csv,.txt,.xlsx,.xls" className={inputClass} onChange={(e) => {setArquivo(e.target.files?.[0] ?? null);limpar();}} />
						<div data-ev-id="ev_f6e70accef">
							<Button onClick={analisar} disabled={!arquivo} loading={analisando}>
								<FileSpreadsheet className="h-4 w-4" /> Analisar arquivo
							</Button>
						</div>
					</div>
				</Card> :
      null}

			{analisado ?
      <Card>
					<CardHeader titulo="3. Resultado da validação" />
					<div data-ev-id="ev_3ea55cf0da" className="flex flex-col gap-4 px-5 py-4">
						<div data-ev-id="ev_7c83e6f2d6" className="grid grid-cols-2 gap-3 md:grid-cols-4">
							<Resumo titulo="Linhas no arquivo" valor={linhas.length} />
							<Resumo titulo="EPCs válidos" valor={vinculos.size} />
							<Resumo titulo="Erros" valor={erros.length} cor={erros.length > 0 ? 'text-red-700' : undefined} />
							<Resumo titulo="Avisos" valor={avisos.length} cor={avisos.length > 0 ? 'text-amber-700' : undefined} />
						</div>

							{erros.length > 0 ?
          <Alert
            tipo="erro"
            titulo={vinculos.size > 0 ? 'Foram encontradas linhas inválidas' : 'Não há EPCs válidos para importar'}
          >
            {vinculos.size > 0 && !importacaoConcluida ?
              <p className="mb-2">Você pode importar os {vinculos.size} EPC(s) válidos; as linhas abaixo serão ignoradas.</p> :
              null}
								<ul data-ev-id="ev_c43a205cac" className="list-inside list-disc">
									{erros.slice(0, 30).map((e, i) => <li data-ev-id="ev_a70d4dc926" key={i}>{e}</li>)}
									{erros.length > 30 ? <li data-ev-id="ev_3e6616d6b9">...e mais {erros.length - 30} erro(s).</li> : null}
								</ul>
							</Alert> :
          null}

						{avisos.length > 0 ?
          <Alert tipo="aviso">
								<ul data-ev-id="ev_a225f96e77" className="list-inside list-disc">
									{avisos.slice(0, 10).map((a, i) => <li data-ev-id="ev_65d030643d" key={i}>{a}</li>)}
								</ul>
							</Alert> :
          null}

						{erros.length === 0 && vinculos.size > 0 ?
          <Alert tipo="sucesso">Validação bem-sucedida. Você pode prosseguir com a importação.</Alert> :
          null}
					</div>

					<div data-ev-id="ev_49eb1261f8" className="flex flex-row justify-end gap-2 border-t border-border px-5 py-4">
						<Button variant="outline" onClick={limpar}>Cancelar</Button>
							<Button onClick={confirmar} disabled={vinculos.size === 0 || importacaoConcluida} loading={importando}>
								<Upload className="h-4 w-4" /> {importacaoConcluida ? 'Importação concluída' : erros.length > 0 ? 'Importar EPCs válidos' : 'Confirmar importação'}
							</Button>
					</div>
				</Card> :
      null}
		</div>);

}

function Resumo({ titulo, valor, cor }: {titulo: string;valor: number;cor?: string;}) {
  return (
    <div data-ev-id="ev_73378addd0" className="flex flex-col gap-1 rounded-md border border-border px-4 py-3">
			<span data-ev-id="ev_1ba2036a73" className="text-xs uppercase text-muted-foreground">{titulo}</span>
			<span data-ev-id="ev_baf160b0d2" className={`text-2xl font-semibold ${cor ?? 'text-slate-900'}`}>{valor}</span>
		</div>);

}
