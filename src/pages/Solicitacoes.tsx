import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../integrations/supabase/client';
import { PageHeader } from '../components/Layout';
import { Alert, Card, CardHeader, Empty, inputClass, Spinner } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { STATUS_LABEL, type RequestStatus } from '../lib/status';
import { formatDateTime, formatNumber } from '../lib/format';

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
          acao={
          <select data-ev-id="ev_c3af9fee74" className={`${inputClass} w-56`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
							<option data-ev-id="ev_10dfe6dc6e" value="TODOS">Todos os status</option>
							{Object.entries(STATUS_LABEL).map(([valor, label]) =>
            <option data-ev-id="ev_5a6df1aa05" key={valor} value={valor}>
									{label}
								</option>
            )}
						</select>
          } />

				{carregando ?
        <Spinner /> :
        visiveis.length === 0 ?
        <Empty texto="Nenhuma solicitação encontrada." /> :

        <div data-ev-id="ev_09613a7d0e" className="overflow-x-auto">
						<table data-ev-id="ev_7194752a2c" className="w-full text-sm">
							<thead data-ev-id="ev_6c5bc683c2" className="bg-muted text-left text-xs uppercase text-muted-foreground">
								<tr data-ev-id="ev_556f611187">
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
											<td data-ev-id="ev_d1f1363e57" className="px-4 py-2 font-medium">
												<Link data-ev-id="ev_d64b0f8290" to={`/solicitacoes/${l.id}`} className="text-primary hover:underline">
													{l.numero}
												</Link>
											</td>
											<td data-ev-id="ev_9534195ab0" className="px-4 py-2">{formatDateTime(l.created_at)}</td>
											<td data-ev-id="ev_c7d184847e" className="px-4 py-2">{nomes[l.usuario_id] ?? '-'}</td>
											<td data-ev-id="ev_4fd31c7f4e" className="px-4 py-2">{itens.length}</td>
											<td data-ev-id="ev_75d16a7e1d" className="px-4 py-2">{formatNumber(tags)}</td>
											<td data-ev-id="ev_5fa46cfd4a" className="px-4 py-2">
												<StatusBadge status={l.status} />
											</td>
											<td data-ev-id="ev_70c6fae888" className="px-4 py-2">{formatDateTime(l.updated_at)}</td>
										</tr>);

              })}
							</tbody>
						</table>
					</div>
        }
			</Card>
		</div>);

}