import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/Layout';
import { Alert, Card, CardHeader, Empty, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_LABEL, type RequestStatus } from '@/lib/status';
import { formatDateTime, formatNumber } from '@/lib/format';

interface Linha {
  id: string;
  numero: string;
  status: RequestStatus;
  usuario_id: string;
  created_at: string;
  updated_at: string;
  request_items: {quantidade: number;}[];
}

const CARDS: Array<{status: RequestStatus;cor: string;}> = [
{ status: 'SOLICITADA', cor: 'border-slate-200' },
{ status: 'EM_PROCESSAMENTO', cor: 'border-blue-200' },
{ status: 'ARQUIVO_EPC_GERADO', cor: 'border-indigo-200' },
{ status: 'EPCS_RECEBIDOS', cor: 'border-amber-200' },
{ status: 'CONCLUIDA', cor: 'border-green-200' },
{ status: 'ERRO', cor: 'border-red-200' }];


export default function Dashboard() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.
      from('requests').
      select('id, numero, status, usuario_id, created_at, updated_at, request_items(quantidade)').
      order('updated_at', { ascending: false }).
      limit(50);
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

  const contar = (status: RequestStatus) => linhas.filter((l) => l.status === status).length;

  return (
    <div data-ev-id="ev_4b45992ae2" className="flex flex-col gap-4">
			<PageHeader titulo="Dashboard" descricao="Visão geral das solicitações de tags EPC." />

			{erro ? <Alert tipo="erro">{erro}</Alert> : null}

			{carregando ?
      <Spinner /> :

      <>
					<div data-ev-id="ev_a39721b231" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
						{CARDS.map((c) =>
          <div data-ev-id="ev_7354e98b96" key={c.status} className={`flex flex-col gap-1 rounded-lg border bg-white px-4 py-4 shadow-sm ${c.cor}`}>
								<span data-ev-id="ev_1f4ba3a026" className="text-xs uppercase text-muted-foreground">{STATUS_LABEL[c.status]}</span>
								<span data-ev-id="ev_4aa2fe026e" className="text-2xl font-semibold text-slate-900">{contar(c.status)}</span>
							</div>
          )}
					</div>

					<Card>
						<CardHeader titulo="Solicitações recentes" descricao="Clique no número para abrir os detalhes." />
						{linhas.length === 0 ?
          <Empty texto="Nenhuma solicitação registrada." /> :

          <div data-ev-id="ev_36e4a7ab02" className="overflow-x-auto">
								<table data-ev-id="ev_7881252c2a" className="w-full text-sm">
									<thead data-ev-id="ev_7829a6d487" className="bg-muted text-left text-xs uppercase text-muted-foreground">
										<tr data-ev-id="ev_d1c5f7250b">
											<th data-ev-id="ev_e310f795b8" className="px-4 py-2">Número</th>
											<th data-ev-id="ev_99c4406a98" className="px-4 py-2">Data</th>
											<th data-ev-id="ev_38b10a5b81" className="px-4 py-2">Solicitante</th>
											<th data-ev-id="ev_d01562ce04" className="px-4 py-2">Quantidade</th>
											<th data-ev-id="ev_80021c11e5" className="px-4 py-2">Status</th>
											<th data-ev-id="ev_613c8b4295" className="px-4 py-2">Última atualização</th>
										</tr>
									</thead>
									<tbody data-ev-id="ev_faa6595e87" className="divide-y divide-border">
										{linhas.map((l) =>
                <tr data-ev-id="ev_108dc634ab" key={l.id} className="hover:bg-slate-50">
												<td data-ev-id="ev_e649dd1b4a" className="px-4 py-2 font-medium">
													<Link data-ev-id="ev_e362d3e791" to={`/solicitacoes/${l.id}`} className="text-primary hover:underline">
														{l.numero}
													</Link>
												</td>
												<td data-ev-id="ev_10b0b1a970" className="px-4 py-2">{formatDateTime(l.created_at)}</td>
												<td data-ev-id="ev_1827817644" className="px-4 py-2">{nomes[l.usuario_id] ?? '-'}</td>
												<td data-ev-id="ev_18d063d503" className="px-4 py-2">{formatNumber((l.request_items ?? []).reduce((a, i) => a + i.quantidade, 0))}</td>
												<td data-ev-id="ev_0de5aec7d8" className="px-4 py-2">
													<StatusBadge status={l.status} />
												</td>
												<td data-ev-id="ev_22d4516b16" className="px-4 py-2">{formatDateTime(l.updated_at)}</td>
											</tr>
                )}
									</tbody>
								</table>
							</div>
          }
					</Card>
				</>
      }
		</div>);

}