import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Download, FileDown, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import type { Tables } from '../integrations/supabase/helpers';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/Layout';
import { Alert, Button, Card, CardHeader, Empty, Spinner } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import type { RequestStatus } from '../lib/status';
import { formatDateTime, formatNumber } from '../lib/format';
import { registrarHistorico } from '../lib/historico';
import { buildEpcRows, buildErpRows, downloadCsv, downloadXlsx, EPC_COLUMNS, epcFileName, ERP_COLUMNS, erpFileName } from '../lib/fileLayouts';

type Request = Tables<'requests'>;
type RequestItem = Tables<'request_items'>;
type Epc = Tables<'epcs'>;
type RequestFile = Tables<'request_files'>;
type RequestHistory = Tables<'request_history'>;

export default function SolicitacaoDetalhe() {
  const { id } = useParams<{id: string;}>();
  const { user, isAdmin } = useAuth();

  const [request, setRequest] = useState<Request | null>(null);
  const [itens, setItens] = useState<RequestItem[]>([]);
  const [epcs, setEpcs] = useState<Epc[]>([]);
  const [arquivos, setArquivos] = useState<RequestFile[]>([]);
  const [historico, setHistorico] = useState<RequestHistory[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(async () => {
    if (!supabase || !id) return;
    setCarregando(true);
    const [rq, ri, re, rf, rh] = await Promise.all([
    supabase.from('requests').select('*').eq('id', id).single(),
    supabase.from('request_items').select('*').eq('request_id', id).order('created_at'),
    supabase.from('epcs').select('*').order('created_at'),
    supabase.from('request_files').select('*').eq('request_id', id).order('created_at', { ascending: false }),
    supabase.from('request_history').select('*').eq('request_id', id).order('created_at', { ascending: false })]
    );
    if (rq.error) setErro(rq.error.message);
    setRequest(rq.data);
    const listaItens = ri.data ?? [];
    setItens(listaItens);
    const idsItens = listaItens.map((i: { id: string }) => i.id);
    if (idsItens.length > 0) {
      const { data: epcsData } = await supabase.from('epcs').select('*').in('request_item_id', idsItens);
      setEpcs(epcsData ?? []);
    } else {
      setEpcs([]);
    }
    setArquivos(rf.data ?? []);
    setHistorico(rh.data ?? []);
    setCarregando(false);
  }, [id]);

  useEffect(() => {void carregar();}, [carregar]);

  const totalTags = itens.reduce((acc, i) => acc + i.quantidade, 0);
  const totalEpcs = epcs.length;

  const gerarArquivoEpc = async () => {
    if (!supabase || !request || !user || !isAdmin) return;
    for (const i of itens) {
      if (!i.ean13) {setErro(`Item ${i.sku} não possui EAN13.`);return;}
      if (i.quantidade <= 0) {setErro(`Item ${i.sku} possui quantidade inválida.`);return;}
    }
    setGerando(true);
    const rows = buildEpcRows(itens.map((i) => ({
      referencia: i.referencia,
      ean13: i.ean13,
      nome: i.nome,
      grupo: i.grupo,
      cor: i.cor,
      tamanho: i.tamanho,
      preco: i.preco,
      unidade: i.unidade,
      quantidade: i.quantidade
    })));
    const nome = epcFileName(request.numero) + '.xlsx';
    try {
      downloadXlsx(nome, EPC_COLUMNS, rows);
      alert(`Arquivo "${nome}" gerado com sucesso!\n\nVerifique a pasta de downloads do seu navegador.`);
    } catch (e) {
      setErro(`Erro ao gerar arquivo: ${(e as Error).message}`);
      setGerando(false);
      return;
    }
    const versao = arquivos.filter((a) => a.tipo === 'EPC').length + 1;
    await supabase.from('request_files').insert({ request_id: request.id, usuario_id: user.id, tipo: 'EPC', nome_arquivo: nome, versao, total_linhas: rows.length });
    if (request.status === 'SOLICITADA' || request.status === 'EM_PROCESSAMENTO') {
      await supabase.from('requests').update({ status: 'ARQUIVO_EPC_GERADO' }).eq('id', request.id);
    }
    await registrarHistorico(request.id, user.id, 'Arquivo EPC gerado', `Arquivo ${nome} com ${rows.length} linha(s).`);
    setGerando(false);
    void carregar();
  };

  const gerarArquivoErp = async () => {
    if (!supabase || !request || !user || !isAdmin) return;
    if (totalEpcs !== totalTags) {setErro(`Divergência de quantidade: solicitado ${totalTags}, recebido ${totalEpcs}.`);return;}
    for (const i of itens) {
      const qtdEpc = epcs.filter((e) => e.request_item_id === i.id).length;
      if (qtdEpc !== i.quantidade) {setErro(`SKU ${i.sku}: solicitado ${i.quantidade}, recebido ${qtdEpc}.`);return;}
    }
    setGerando(true);
    const mapItem = new Map(itens.map((i) => [i.id, i]));
    const rows = buildErpRows(epcs.map((e) => ({ epc: e.epc, sku: mapItem.get(e.request_item_id)?.sku ?? '' })));
    const nome = erpFileName(request.numero) + '.csv';
    try {
      downloadCsv(nome, ERP_COLUMNS, rows);
      alert(`Arquivo "${nome}" gerado com sucesso!\n\nVerifique a pasta de downloads do seu navegador.`);
    } catch (e) {
      setErro(`Erro ao gerar arquivo: ${(e as Error).message}`);
      setGerando(false);
      return;
    }
    const versao = arquivos.filter((a) => a.tipo === 'ERP').length + 1;
    await supabase.from('request_files').insert({ request_id: request.id, usuario_id: user.id, tipo: 'ERP', nome_arquivo: nome, versao, total_linhas: rows.length });
    await supabase.from('requests').update({ status: 'CONCLUIDA' }).eq('id', request.id);
    await registrarHistorico(request.id, user.id, 'Arquivo ERP gerado', `Arquivo ${nome} com ${rows.length} linha(s). Solicitação concluída.`);
    setGerando(false);
    void carregar();
  };

  if (carregando) return <Spinner texto="Carregando solicitação..." />;
  if (!request) return <Alert tipo="erro">Solicitação não encontrada.</Alert>;

  return (
    <div data-ev-id="ev_765efd24d5" className="flex flex-col gap-4">
			<PageHeader
        titulo={request.numero}
        descricao={`Criada em ${formatDateTime(request.created_at)}`}
        acoes={
        <Link data-ev-id="ev_e37d10207e" to={isAdmin ? '/solicitacoes' : '/minhas-solicitacoes'}>
						<Button variant="outline"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
					</Link>
        } />


			{erro ? <Alert tipo="erro">{erro}</Alert> : null}

			<div data-ev-id="ev_dd7ffb473e" className="grid grid-cols-2 gap-3 md:grid-cols-4">
				<InfoCard titulo="Status" valor={<StatusBadge status={request.status} />} />
				<InfoCard titulo="Itens" valor={itens.length} />
				<InfoCard titulo="Tags solicitadas" valor={formatNumber(totalTags)} />
				<InfoCard titulo="EPCs recebidos" valor={formatNumber(totalEpcs)} />
			</div>

			<Card>
				<CardHeader titulo="Itens da solicitação" />
				{itens.length === 0 ? <Empty texto="Nenhum item." /> :
        <div data-ev-id="ev_bfbf4cb8ef" className="overflow-x-auto">
						<table data-ev-id="ev_04b48a665b" className="w-full text-sm">
							<thead data-ev-id="ev_5a8638adf9" className="bg-muted text-left text-xs uppercase text-muted-foreground">
								<tr data-ev-id="ev_669b4bde9e">
									<th data-ev-id="ev_9362b76d41" className="px-4 py-2">Ref.</th>
									<th data-ev-id="ev_534719ac0b" className="px-4 py-2">Coleção</th>
									<th data-ev-id="ev_41ee216733" className="px-4 py-2">Cor</th>
									<th data-ev-id="ev_3e101ea0a5" className="px-4 py-2">Tam.</th>
									<th data-ev-id="ev_8193704639" className="px-4 py-2">SKU</th>
									<th data-ev-id="ev_418f152cd8" className="px-4 py-2">EAN13</th>
									<th data-ev-id="ev_8895db75d7" className="px-4 py-2">Qtd.</th>
									<th data-ev-id="ev_d8ccf50054" className="px-4 py-2">EPCs</th>
								</tr>
							</thead>
							<tbody data-ev-id="ev_f3d75d1984" className="divide-y divide-border">
								{itens.map((i) => {
                const qtdEpc = epcs.filter((e) => e.request_item_id === i.id).length;
                const ok = qtdEpc === i.quantidade;
                return (
                  <tr data-ev-id="ev_1e25f4e8a1" key={i.id} className="hover:bg-slate-50">
											<td data-ev-id="ev_b228dc6686" className="px-4 py-2 font-medium">{i.referencia}</td>
											<td data-ev-id="ev_075873620f" className="px-4 py-2">{i.colecao ?? '-'}</td>
											<td data-ev-id="ev_9f7d1de06e" className="px-4 py-2">{i.cor ?? '-'}</td>
											<td data-ev-id="ev_9b557c73bd" className="px-4 py-2">{i.tamanho ?? '-'}</td>
											<td data-ev-id="ev_667b802e58" className="px-4 py-2">{i.sku}</td>
											<td data-ev-id="ev_188cee1c2c" className="px-4 py-2">{i.ean13 ?? '-'}</td>
											<td data-ev-id="ev_86917818e6" className="px-4 py-2">{i.quantidade}</td>
											<td data-ev-id="ev_3ca10299ea" className={`px-4 py-2 ${ok ? 'text-green-700' : 'text-red-700'}`}>{qtdEpc}</td>
										</tr>);

              })}
							</tbody>
						</table>
					</div>
        }
			</Card>

			{isAdmin ?
      <Card>
					<CardHeader titulo="Ações" descricao="Gerar arquivos para o sistema externo e para o ERP." />
					<div data-ev-id="ev_eae3f71658" className="flex flex-row flex-wrap gap-3 px-5 py-4">
						<Button onClick={gerarArquivoEpc} loading={gerando} disabled={itens.length === 0}>
							<FileSpreadsheet className="h-4 w-4" /> Gerar arquivo EPC
						</Button>
						<Link data-ev-id="ev_a47e38779b" to={`/importar-epcs?request=${request.id}`}>
							<Button variant="outline"><Download className="h-4 w-4" /> Importar EPCs</Button>
						</Link>
						<Button onClick={gerarArquivoErp} loading={gerando} disabled={totalEpcs === 0 || totalEpcs !== totalTags}>
							<FileDown className="h-4 w-4" /> Gerar arquivo ERP
						</Button>
					</div>
				</Card> :
      null}

			<Card>
				<CardHeader titulo="Arquivos gerados" />
				{arquivos.length === 0 ? <Empty texto="Nenhum arquivo gerado." /> :
        <div data-ev-id="ev_ea31d82188" className="overflow-x-auto">
						<table data-ev-id="ev_2b684d660b" className="w-full text-sm">
							<thead data-ev-id="ev_dc064b8296" className="bg-muted text-left text-xs uppercase text-muted-foreground">
								<tr data-ev-id="ev_7eb0e93f59">
									<th data-ev-id="ev_1c312d585b" className="px-4 py-2">Tipo</th>
									<th data-ev-id="ev_3aba76cd11" className="px-4 py-2">Arquivo</th>
									<th data-ev-id="ev_c2747efd9f" className="px-4 py-2">Versão</th>
									<th data-ev-id="ev_ca363cb558" className="px-4 py-2">Linhas</th>
									<th data-ev-id="ev_4057ddfa75" className="px-4 py-2">Data</th>
								</tr>
							</thead>
							<tbody data-ev-id="ev_06a7e520fd" className="divide-y divide-border">
								{arquivos.map((a) =>
              <tr data-ev-id="ev_98d416e730" key={a.id}>
										<td data-ev-id="ev_dd850925c9" className="px-4 py-2 font-medium">{a.tipo}</td>
										<td data-ev-id="ev_92f0d799ae" className="px-4 py-2">{a.nome_arquivo}</td>
										<td data-ev-id="ev_b47ba9356e" className="px-4 py-2">{a.versao}</td>
										<td data-ev-id="ev_72afde78d2" className="px-4 py-2">{a.total_linhas ?? '-'}</td>
										<td data-ev-id="ev_dbf586f140" className="px-4 py-2">{formatDateTime(a.created_at)}</td>
									</tr>
              )}
							</tbody>
						</table>
					</div>
        }
			</Card>

			<Card>
				<CardHeader titulo="Histórico" />
				{historico.length === 0 ? <Empty texto="Nenhum evento registrado." /> :
        <div data-ev-id="ev_93783c5211" className="overflow-x-auto">
						<table data-ev-id="ev_0c3d10d0b4" className="w-full text-sm">
							<thead data-ev-id="ev_3175f9a889" className="bg-muted text-left text-xs uppercase text-muted-foreground">
								<tr data-ev-id="ev_47d4ffdc8c">
									<th data-ev-id="ev_9c2475b271" className="px-4 py-2">Data</th>
									<th data-ev-id="ev_db1e645e44" className="px-4 py-2">Ação</th>
									<th data-ev-id="ev_eb8e95d29d" className="px-4 py-2">Detalhes</th>
								</tr>
							</thead>
							<tbody data-ev-id="ev_caee4cba8a" className="divide-y divide-border">
								{historico.map((h) =>
              <tr data-ev-id="ev_3e117e4343" key={h.id}>
										<td data-ev-id="ev_a075932854" className="whitespace-nowrap px-4 py-2">{formatDateTime(h.created_at)}</td>
										<td data-ev-id="ev_8c022c6468" className="px-4 py-2 font-medium">{h.acao}</td>
										<td data-ev-id="ev_c7cba44cdd" className="px-4 py-2 text-muted-foreground">{h.detalhes ?? '-'}</td>
									</tr>
              )}
							</tbody>
						</table>
					</div>
        }
			</Card>
		</div>);

}

function InfoCard({ titulo, valor }: {titulo: string;valor: React.ReactNode;}) {
  return (
    <div data-ev-id="ev_3f2e9a714e" className="flex flex-col gap-1 rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
			<span data-ev-id="ev_1c8242f377" className="text-xs uppercase text-muted-foreground">{titulo}</span>
			<span data-ev-id="ev_bf2071a709" className="text-lg font-semibold text-slate-900">{valor}</span>
		</div>);

}