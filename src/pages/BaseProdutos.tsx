import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Search, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/helpers';
import { PageHeader } from '@/components/Layout';
import { Alert, Button, Card, CardHeader, Empty, inputClass, Spinner } from '@/components/ui';
import { formatCurrency, formatNumber } from '@/lib/format';

type Produto = Tables<'products'>;

export default function BaseProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [total, setTotal] = useState(0);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (termo: string) => {
    if (!supabase) return;
    setCarregando(true);
    setErro(null);
    let query = supabase.from('products').select('*', { count: 'exact' }).order('referencia').limit(100);
    if (termo.trim()) {
      const t = `%${termo.trim()}%`;
      query = query.or(`referencia.ilike.${t},sku.ilike.${t},ean13.ilike.${t},nome.ilike.${t}`);
    }
    const { data, error, count } = await query;
    if (error) setErro(error.message);
    setProdutos(data ?? []);
    setTotal(count ?? 0);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar('');
  }, [carregar]);

  return (
    <div data-ev-id="ev_d4529f334b" className="flex flex-col gap-4">
			<PageHeader
        titulo="Base de Produtos"
        descricao="Fonte oficial de SKU, EAN13 e dados técnicos. Somente administradores podem alterar."
        acoes={
        <Link data-ev-id="ev_e9eb35dc9d" to="/produtos/importar">
						<Button>
							<Upload className="h-4 w-4" /> Importar Base de Produtos
						</Button>
					</Link>
        } />


			{erro ? <Alert tipo="erro">{erro}</Alert> : null}

			<Card>
				<CardHeader
          titulo={`${formatNumber(total)} produto(s) cadastrado(s)`}
          descricao="Exibindo no máximo 100 registros por consulta."
          acao={
          <form data-ev-id="ev_92f450db4f"
          className="flex flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void carregar(busca);
          }}>

							<input data-ev-id="ev_9b27c766c9" className={`${inputClass} w-64`} placeholder="Referência, SKU, EAN ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
							<Button type="submit" variant="outline">
								<Search className="h-4 w-4" /> Buscar
							</Button>
						</form>
          } />

				{carregando ?
        <Spinner /> :
        produtos.length === 0 ?
        <Empty texto="Nenhum produto encontrado. Importe a base de produtos para começar." /> :

        <div data-ev-id="ev_07ceaa9f7d" className="overflow-x-auto">
						<table data-ev-id="ev_794a694040" className="w-full text-sm">
							<thead data-ev-id="ev_17ad3a221f" className="bg-muted text-left text-xs uppercase text-muted-foreground">
								<tr data-ev-id="ev_9c3406661c">
									<th data-ev-id="ev_0252300c9f" className="px-4 py-2">Referência</th>
									<th data-ev-id="ev_56598f8aa7" className="px-4 py-2">SKU</th>
									<th data-ev-id="ev_43de50198b" className="px-4 py-2">EAN13</th>
									<th data-ev-id="ev_a1bf8b46ad" className="px-4 py-2">Nome</th>
									<th data-ev-id="ev_637e989353" className="px-4 py-2">Grupo</th>
									<th data-ev-id="ev_470776b455" className="px-4 py-2">Coleção</th>
									<th data-ev-id="ev_7a7e3209aa" className="px-4 py-2">Cor</th>
									<th data-ev-id="ev_2b3de5d497" className="px-4 py-2">Tamanho</th>
									<th data-ev-id="ev_d19b57d579" className="px-4 py-2">Preço</th>
									<th data-ev-id="ev_ddfe25034d" className="px-4 py-2">Un.</th>
								</tr>
							</thead>
							<tbody data-ev-id="ev_091fac7004" className="divide-y divide-border">
								{produtos.map((p) =>
              <tr data-ev-id="ev_54abea8964" key={p.id} className="hover:bg-slate-50">
										<td data-ev-id="ev_95b3824933" className="px-4 py-2 font-medium text-slate-900">{p.referencia}</td>
										<td data-ev-id="ev_728c1183c6" className="px-4 py-2">{p.sku}</td>
										<td data-ev-id="ev_02c6e3e9c8" className="px-4 py-2">{p.ean13 ?? '-'}</td>
										<td data-ev-id="ev_4381f566c1" className="px-4 py-2">{p.nome ?? '-'}</td>
										<td data-ev-id="ev_4b18b1f6a5" className="px-4 py-2">{p.grupo ?? '-'}</td>
										<td data-ev-id="ev_cac1356d0d" className="px-4 py-2">{p.colecao ?? '-'}</td>
										<td data-ev-id="ev_7a40217a05" className="px-4 py-2">{p.cor ?? '-'}</td>
										<td data-ev-id="ev_7ee5660188" className="px-4 py-2">{p.tamanho ?? '-'}</td>
										<td data-ev-id="ev_5b23eb6277" className="px-4 py-2">{formatCurrency(p.preco)}</td>
										<td data-ev-id="ev_19ec969792" className="px-4 py-2">{p.unidade ?? '-'}</td>
									</tr>
              )}
							</tbody>
						</table>
					</div>
        }
			</Card>
		</div>);

}