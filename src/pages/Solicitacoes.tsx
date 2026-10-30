import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { FileDown } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { PageHeader } from '../components/Layout';
import { Alert, Button, Card, CardHeader, Empty, inputClass, Spinner } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { STATUS_LABEL, type RequestStatus } from '../lib/status';
import { formatDateTime, formatNumber } from '../lib/format';
import { buildEpcRows, buildErpRows, downloadCsv, downloadXlsx, EPC_COLUMNS, epcFileName, ERP_COLUMNS, erpBatchFileName } from '../lib/fileLayouts';
import { registrarHistorico } from '../lib/historico';
import { useAuth } from '../hooks/useAuth';

interface Linha {
  id: string;
  numero: string;
  status: RequestStatus;
  usuario_id: string;
  created_at: string;
  updated_at: string;
  request_items: {quantidade: number;}[];
}

export default function Solicitacoes() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<string>('TODOS');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { isAdmin, user } = useAuth();
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [gerandoLote, setGerandoLote] = useState(false);

  const gerarEpcEmLote = async () => {
    if (!supabase || !isAdmin || !user || selecionadas.length === 0) return;
    setGerandoLote(true);
    setErro(null);
    try {
      const { data: items, error } = await supabase.from('request_items').select('*').in('request_id', selecionadas).order('created_at');
      if (error) throw error;
      const porSolicitacao = new Map<string, typeof items>();
      for (const item of items ?? []) {
        const atuais = porSolicitacao.get(item.request_id) ?? [];
        atuais.push(item);
        porSolicitacao.set(item.request_id, atuais);
      }
      const arquivosGerados: { request_id: string; nome: string; linhas: number }[] = [];
      for (const requestId of selecionadas) {
        const requestItems = porSolicitacao.get(requestId) ?? [];
        if (requestItems.length === 0) throw new Error(`A solicitação selecionada não possui itens.`);
        for (const item of requestItems) {
          if (!item.ean13) throw new Error(`Item ${item.sku} não possui EAN13.`);
          if (item.quantidade <= 0) throw new Error(`Item ${item.sku} possui quantidade inválida.`);
        }
        const request = linhas.find((linha) => linha.id === requestId);
        if (!request) continue;
        const rows = buildEpcRows(requestItems.map((item) => ({
          referencia: item.referencia,
          ean13: item.ean13,
          nome: item.nome,
          grupo: item.grupo,
          cor: item.cor,
          tamanho: item.tamanho,
          preco: item.preco,
          unidade: item.unidade,
          quantidade: item.quantidade,
        })));
        const nome = `${epcFileName(request.numero)}_${selecionadas.indexOf(requestId) + 1}.xlsx`;
        downloadXlsx(nome, EPC_COLUMNS, rows);
        arquivosGerados.push({ request_id: requestId, nome, linhas: rows.length });
      }
      const { error: statusError } = await supabase.from('requests').update({ status: 'CONCLUIDA' }).in('id', arquivosGerados.map((arquivo) => arquivo.request_id));
      if (statusError) throw statusError;
      await Promise.all(arquivosGerados.map((arquivo) => registrarHistorico(arquivo.request_id, user.id, 'Arquivo EPC gerado', `Arquivo ${arquivo.nome} com ${arquivo.linhas} linha(s).`)));
      alert(`${arquivosGerados.length} arquivo(s) EPC gerado(s) separadamente. Verifique a pasta de downloads do seu navegador.`);
      setSelecionadas([]);
    } catch (e) {
      setErro(`Não foi possível gerar os arquivos EPC em lote: ${(e as Error).message}`);
    }
    setGerandoLote(false);
  };

  const gerarErpEmLote = async () => {
    if (!supabase || !isAdmin || !user || selecionadas.length === 0) return;
    setGerandoLote(true);
    setErro(null);
    try {
      const { data: items, error: itemsError } = await supabase.from('request_items').select('*').in('request_id', selecionadas);
      if (itemsError) throw itemsError;
      const { data: epcs, error: epcsError } = await supabase.from('epcs').select('*').in('request_item_id', (items ?? []).map((item) => item.id));
      if (epcsError) throw epcsError;
      const itemMap = new Map((items ?? []).map((item) => [item.id, item]));
      const divergente = selecionadas.find((id) => {
        const reqItems = (items ?? []).filter((item) => item.request_id === id);
        return reqItems.some((item) => (epcs ?? []).filter((epc) => epc.request_item_id === item.id).length !== item.quantidade);
      });
      if (divergente) throw new Error(`A solicitação ${linhas.find((l) => l.id === divergente)?.numero ?? divergente} ainda possui divergência de EPCs.`);
      const rows = buildErpRows((epcs ?? []).map((epc) => ({ epc: epc.epc, sku: itemMap.get(epc.request_item_id)?.sku ?? '' })));
      const nome = erpBatchFileName() + '.csv';
      downloadCsv(nome, ERP_COLUMNS, rows);
      const { error: statusError } = await supabase.from('requests').update({ status: 'CONCLUIDA' }).in('id', selecionadas);
      if (statusError) throw statusError;
      alert(`Arquivo "${nome}" gerado com ${rows.length} EPC(s).`);
      setSelecionadas([]);
    } catch (e) { setErro(`Não foi possível gerar o ERP em lote: ${(e as Error).message}`); }
    setGerandoLote(false);
  };

  useEffect(() => {
    const carregar = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.
      from('requests').
      select('id, numero, status, usuario_id, created_at, updated_at, request_items(quantidade)').
      order('created_at', { ascending: false });
      if (error) setErro(error.message);
      const lista = data as Linha[] | null ?? [];
      setLinhas(lista);

      const ids = Array.from(new Set(lista.map((l) => l.usuario_id)));
      if (ids.length > 0) {
        const { data: perfis } = await supabase.from('profiles').select('id, nome, email').in('id', ids);
        const mapa: Record<string, string> = {};
        for (const p of perfis ?? []) mapa[p.id] = p.nome ?? p.email ?? p.id;
        setNomes(mapa);
      }
      setCarregando(false);
    };
    void carregar();
  }, []);

  const visiveis = filtro === 'TODOS' ? linhas : linhas.filter((l) => l.status === filtro);

  return (
    <div data-ev-id="ev_57ec2eaefc" className="flex flex-col gap-4">
			<PageHeader titulo="Solicitações" descricao="Todas as solicitações de tags EPC registradas no sistema." />

			{erro ? <Alert tipo="erro">{erro}</Alert> : null}

			<Card>
				<CardHeader
          titulo={`${visiveis.length} solicitação(ões)`}
          descricao="Marque solicitações para gerar arquivos EPC separados ou um único arquivo ERP."
          acao={
            <div className="flex flex-wrap items-center gap-2">
              <select data-ev-id="ev_c3af9fee74" className={`${inputClass} w-56`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="TODOS">Todos os status</option>
                {Object.entries(STATUS_LABEL).map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
              </select>
              {isAdmin ? <>
                <Button variant="outline" onClick={gerarEpcEmLote} loading={gerandoLote} disabled={selecionadas.length === 0}><FileDown className="h-4 w-4" /> EPC em lote ({selecionadas.length})</Button>
                <Button onClick={gerarErpEmLote} loading={gerandoLote} disabled={selecionadas.length === 0}><FileDown className="h-4 w-4" /> ERP em lote ({selecionadas.length})</Button>
              </> : null}
            </div>
          } />

        {carregando ? <Spinner /> : visiveis.length === 0 ? <Empty texto="Nenhuma solicitação encontrada." /> :
          <div data-ev-id="ev_09613a7d0e" className="overflow-x-auto">
            <table data-ev-id="ev_7194752a2c" className="w-full text-sm">
              <thead data-ev-id="ev_6c5bc683c2" className="bg-muted text-left text-xs uppercase text-muted-foreground">
                <tr data-ev-id="ev_556f611187">
                  <th className="px-4 py-2">Lote</th>
                  <th data-ev-id="ev_2df4063b10" className="px-4 py-2">Número</th>
                  <th data-ev-id="ev_6d85fceba5" className="px-4 py-2">Data</th>
                  <th data-ev-id="ev_e73c7af529" className="px-4 py-2">Solicitante</th>
                  <th data-ev-id="ev_9a82637d82" className="px-4 py-2">Itens</th>
                  <th data-ev-id="ev_ad958f9c9f" className="px-4 py-2">Quantidade</th>
                  <th data-ev-id="ev_e52170fe86" className="px-4 py-2">Status</th>
                  <th data-ev-id="ev_3a5d48829d" className="px-4 py-2">Última atualização</th>
                </tr>
              </thead>
              <tbody data-ev-id="ev_ac4a44f14c" className="divide-y divide-border">
                {visiveis.map((l) => {
                  const itens = l.request_items ?? [];
                  const tags = itens.reduce((acc, i) => acc + i.quantidade, 0);
                  return (
                    <tr data-ev-id="ev_7a8cfad697" key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2"><input type="checkbox" checked={selecionadas.includes(l.id)} onChange={() => setSelecionadas((atual) => atual.includes(l.id) ? atual.filter((id) => id !== l.id) : [...atual, l.id])} aria-label={`Selecionar ${l.numero}`} /></td>
                      <td data-ev-id="ev_d1f1363e57" className="px-4 py-2 font-medium"><Link data-ev-id="ev_d64b0f8290" to={`/solicitacoes/${l.id}`} className="text-primary hover:underline">{l.numero}</Link></td>
                      <td data-ev-id="ev_9534195ab0" className="px-4 py-2">{formatDateTime(l.created_at)}</td>
                      <td data-ev-id="ev_c7d184847e" className="px-4 py-2">{nomes[l.usuario_id] ?? '-'}</td>
                      <td data-ev-id="ev_4fd31c7f4e" className="px-4 py-2">{itens.length}</td>
                      <td data-ev-id="ev_75d16a7e1d" className="px-4 py-2">{formatNumber(tags)}</td>
                      <td data-ev-id="ev_5fa46cfd4a" className="px-4 py-2"><StatusBadge status={l.status} /></td>
                      <td data-ev-id="ev_70c6fae888" className="px-4 py-2">{formatDateTime(l.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        }
        </Card>
			</div>);

}
