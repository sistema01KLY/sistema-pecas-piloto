import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PlusCircle } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/Layout';
import { Alert, Button, Card, Empty, Spinner } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import type { RequestStatus } from '../lib/status';
import { formatDateTime, formatNumber } from '../lib/format';

interface Linha {
  id: string;
  numero: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  request_items: {quantidade: number;}[];
}

export default function MinhasSolicitacoes() {
  const { user } = useAuth();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async () => {
      if (!supabase || !user) return;
      const { data, error } = await supabase.
      from('requests').
      select('id, numero, status, created_at, updated_at, request_items(quantidade)').
      eq('usuario_id', user.id).
      order('created_at', { ascending: false });
      if (error) setErro(error.message);
      setLinhas(data as Linha[] | null ?? []);
      setCarregando(false);
    };
    void carregar();
  }, [user]);

  return (
    <div data-ev-id="ev_3536458250" className="flex flex-col gap-4">
			<PageHeader
        titulo="Minhas Solicitações"
        descricao="Acompanhe o andamento das suas solicitações de tags EPC."
        acoes={
        <Link data-ev-id="ev_066f82daba" to="/nova-solicitacao">
						<Button>
							<PlusCircle className="h-4 w-4" /> Nova Solicitação
						</Button>
					</Link>
        } />


			{erro ? <Alert tipo="erro">{erro}</Alert> : null}

			<Card>
				{carregando ?
        <Spinner /> :
        linhas.length === 0 ?
        <Empty texto="Você ainda não possui solicitações." /> :

        <div data-ev-id="ev_d6d6561a87" className="overflow-x-auto">
						<table data-ev-id="ev_078bc32f14" className="w-full text-sm">
							<thead data-ev-id="ev_00fdc68d28" className="bg-muted text-left text-xs uppercase text-muted-foreground">
								<tr data-ev-id="ev_f4e915fd23">
									<th data-ev-id="ev_9a9d1a01a0" className="px-4 py-2">Número</th>
									<th data-ev-id="ev_57e47a1f1c" className="px-4 py-2">Data</th>
									<th data-ev-id="ev_f4d019990a" className="px-4 py-2">Itens</th>
									<th data-ev-id="ev_1915714c6d" className="px-4 py-2">Total de tags</th>
									<th data-ev-id="ev_b9851515aa" className="px-4 py-2">Status</th>
									<th data-ev-id="ev_cf44111812" className="px-4 py-2">Última atualização</th>
								</tr>
							</thead>
							<tbody data-ev-id="ev_5060d391db" className="divide-y divide-border">
								{linhas.map((l) => {
                const itens = l.request_items ?? [];
                const tags = itens.reduce((acc, i) => acc + i.quantidade, 0);
                return (
                  <tr data-ev-id="ev_ebf46bcf6c" key={l.id} className="hover:bg-slate-50">
											<td data-ev-id="ev_4f498b0344" className="px-4 py-2 font-medium">
												<Link data-ev-id="ev_5c0e3d036c" to={`/solicitacoes/${l.id}`} className="text-primary hover:underline">
													{l.numero}
												</Link>
											</td>
											<td data-ev-id="ev_b350da7234" className="px-4 py-2">{formatDateTime(l.created_at)}</td>
											<td data-ev-id="ev_851d51ad18" className="px-4 py-2">{itens.length}</td>
											<td data-ev-id="ev_9fc5c72f95" className="px-4 py-2">{formatNumber(tags)}</td>
											<td data-ev-id="ev_6e68641497" className="px-4 py-2">
												<StatusBadge status={l.status} />
											</td>
											<td data-ev-id="ev_1df390e439" className="px-4 py-2">{formatDateTime(l.updated_at)}</td>
										</tr>);

              })}
							</tbody>
						</table>
					</div>
        }
			</Card>
		</div>);

}