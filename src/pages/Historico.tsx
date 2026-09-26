import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/Layout';
import { Alert, Card, CardHeader, Empty, Spinner } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

interface Registro {
  id: string;
  request_id: string;
  usuario_id: string | null;
  acao: string;
  detalhes: string | null;
  created_at: string;
  requests: {numero: string;} | null;
}

export default function Historico() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.
      from('request_history').
      select('id, request_id, usuario_id, acao, detalhes, created_at, requests(numero)').
      order('created_at', { ascending: false }).
      limit(200);
      if (error) setErro(error.message);
      const lista = data as unknown as Registro[] | null ?? [];
      setRegistros(lista);
      const ids = Array.from(new Set(lista.map((r) => r.usuario_id).filter((v): v is string => !!v)));
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

  return (
    <div data-ev-id="ev_b896285b0d" className="flex flex-col gap-4">
			<PageHeader titulo="Histórico" descricao="Registro completo de ações realizadas nas solicitações." />

			{erro ? <Alert tipo="erro">{erro}</Alert> : null}

			<Card>
				<CardHeader titulo="Últimos 200 eventos" />
				{carregando ?
        <Spinner /> :
        registros.length === 0 ?
        <Empty texto="Nenhum evento registrado até o momento." /> :

        <div data-ev-id="ev_d3ebdca3f4" className="overflow-x-auto">
						<table data-ev-id="ev_9ecce683ae" className="w-full text-sm">
							<thead data-ev-id="ev_c3b3f3fa72" className="bg-muted text-left text-xs uppercase text-muted-foreground">
								<tr data-ev-id="ev_a1ed92a9fa">
									<th data-ev-id="ev_9c12a8a218" className="px-4 py-2">Data e hora</th>
									<th data-ev-id="ev_a72aa839ab" className="px-4 py-2">Solicitação</th>
									<th data-ev-id="ev_c867fa7f7e" className="px-4 py-2">Usuário</th>
									<th data-ev-id="ev_c015d6827b" className="px-4 py-2">Ação</th>
									<th data-ev-id="ev_d6c0d8c651" className="px-4 py-2">Detalhes</th>
								</tr>
							</thead>
							<tbody data-ev-id="ev_3ee75d56b3" className="divide-y divide-border">
								{registros.map((r) =>
              <tr data-ev-id="ev_367a691c62" key={r.id} className="hover:bg-slate-50">
										<td data-ev-id="ev_f473d118c0" className="whitespace-nowrap px-4 py-2">{formatDateTime(r.created_at)}</td>
										<td data-ev-id="ev_d88e45f6ec" className="px-4 py-2">
											<Link data-ev-id="ev_f41bee14cd" to={`/solicitacoes/${r.request_id}`} className="text-primary hover:underline">
												{r.requests?.numero ?? 'Abrir'}
											</Link>
										</td>
										<td data-ev-id="ev_f7ec08474c" className="px-4 py-2">{r.usuario_id ? nomes[r.usuario_id] ?? '-' : '-'}</td>
										<td data-ev-id="ev_839540a2dc" className="px-4 py-2 font-medium text-slate-900">{r.acao}</td>
										<td data-ev-id="ev_ae3841147a" className="px-4 py-2 text-muted-foreground">{r.detalhes ?? '-'}</td>
									</tr>
              )}
							</tbody>
						</table>
					</div>
        }
			</Card>
		</div>);

}