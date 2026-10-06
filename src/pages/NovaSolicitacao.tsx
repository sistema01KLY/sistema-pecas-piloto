import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import type { Tables } from '../integrations/supabase/helpers';
import { useAuth } from '../hooks/useAuth';
import { PageHeader } from '../components/Layout';
import { Alert, Button, Card, CardHeader, Empty, Field, inputClass } from '../components/ui';
import { registrarHistorico } from '../lib/historico';
import { formatNumber } from '../lib/format';

type Produto = Tables<'products'>;

interface ItemSolicitacao {
  produto: Produto;
  quantidade: number;
}

interface Rascunho {
  itens: ItemSolicitacao[];
  referencia: string | null;
  colecao: string;
  cor: string;
  tamanho: string;
  quantidade: string;
}

function lerRascunho(chave: string): Rascunho | null {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as Partial<Rascunho>;
    return {
      itens: Array.isArray(dados.itens) ? dados.itens : [],
      referencia: dados.referencia ?? null,
      colecao: dados.colecao ?? '',
      cor: dados.cor ?? '',
      tamanho: dados.tamanho ?? '',
      quantidade: dados.quantidade ?? ''
    };
  } catch {
    return null;
  }
}

function unicos(valores: (string | null)[]): string[] {
  return Array.from(new Set(valores.filter((v): v is string => !!v && v.trim() !== ''))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function Info({ titulo, valor }: {titulo: string;valor: string;}) {
  return (
    <div data-ev-id="ev_17a26ec9ee" className="flex flex-col">
			<span data-ev-id="ev_48bc521bdd" className="text-xs text-muted-foreground">{titulo}</span>
			<span data-ev-id="ev_2cb595e354" className="font-medium text-slate-900">{valor}</span>
		</div>);

}

export default function NovaSolicitacao() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [busca, setBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [referencia, setReferencia] = useState<string | null>(null);
  const [produtosRef, setProdutosRef] = useState<Produto[]>([]);
  const [colecao, setColecao] = useState('');
  const [cor, setCor] = useState('');
  const [tamanho, setTamanho] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [itens, setItens] = useState<ItemSolicitacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [rascunhoCarregado, setRascunhoCarregado] = useState(false);
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);

  const chaveRascunho = user ? `rascunho-nova-solicitacao:${user.id}` : null;

  useEffect(() => {
    if (!chaveRascunho) return;
    let ativo = true;
    const rascunho = lerRascunho(chaveRascunho);
    if (!rascunho) {
      setRascunhoCarregado(true);
      return;
    }
    const temConteudo = rascunho.itens.length > 0 || !!rascunho.referencia;
    setItens(rascunho.itens);
    const restaurarSelecao = async () => {
      if (rascunho.referencia && supabase) {
        const { data } = await supabase.from('products').select('*').eq('referencia', rascunho.referencia).eq('ativo', true);
        if (!ativo) return;
        setProdutosRef(data ?? []);
        setReferencia(rascunho.referencia);
        setBusca(rascunho.referencia);
        setColecao(rascunho.colecao);
        setCor(rascunho.cor);
        setTamanho(rascunho.tamanho);
        setQuantidade(rascunho.quantidade);
      }
      if (!ativo) return;
      setRascunhoRestaurado(temConteudo);
      setRascunhoCarregado(true);
    };
    void restaurarSelecao();
    return () => {
      ativo = false;
    };
  }, [chaveRascunho]);

  useEffect(() => {
    if (!chaveRascunho || !rascunhoCarregado) return;
    if (itens.length === 0 && !referencia) {
      localStorage.removeItem(chaveRascunho);
      return;
    }
    const rascunho: Rascunho = { itens, referencia, colecao, cor, tamanho, quantidade };
    localStorage.setItem(chaveRascunho, JSON.stringify(rascunho));
  }, [chaveRascunho, rascunhoCarregado, itens, referencia, colecao, cor, tamanho, quantidade]);

  const descartarRascunho = () => {
    if (chaveRascunho) localStorage.removeItem(chaveRascunho);
    setItens([]);
    setReferencia(null);
    setProdutosRef([]);
    setColecao('');
    setCor('');
    setTamanho('');
    setQuantidade('');
    setBusca('');
    setErro(null);
    setRascunhoRestaurado(false);
  };

  useEffect(() => {
    if (!supabase || referencia || busca.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    let ativo = true;
    const timer = setTimeout(async () => {
      if (!supabase) return;
      const { data } = await supabase.
      from('products').
      select('referencia').
      eq('ativo', true).
      ilike('referencia', `%${busca.trim()}%`).
      order('referencia').
      limit(300);
      if (!ativo) return;
      const sugestoes = unicos((data ?? []).map((d: { referencia: string | null }) => d.referencia));
      setSugestoes(sugestoes.slice(0, 15));
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [busca, referencia]);

  const selecionarReferencia = useCallback(async (ref: string) => {
    if (!supabase) return;
    setErro(null);
    setBusca(ref);
    setSugestoes([]);
    setColecao('');
    setCor('');
    setTamanho('');
    const { data } = await supabase.from('products').select('*').eq('referencia', ref).eq('ativo', true);
    const lista = data ?? [];
    setProdutosRef(lista);
    setReferencia(ref);
    const colecoes = unicos(lista.map((p: { colecao: string | null }) => p.colecao));
    if (colecoes.length === 1) setColecao(colecoes[0]);
  }, []);

  const limparSelecao = () => {
    setReferencia(null);
    setProdutosRef([]);
    setColecao('');
    setCor('');
    setTamanho('');
    setQuantidade('');
    setBusca('');
    setErro(null);
  };

  const colecoes = useMemo(() => unicos(produtosRef.map((p) => p.colecao)), [produtosRef]);
  const cores = useMemo(() => unicos(produtosRef.filter((p) => p.colecao === colecao).map((p) => p.cor)), [produtosRef, colecao]);
  const tamanhos = useMemo(
    () => unicos(produtosRef.filter((p) => p.colecao === colecao && p.cor === cor).map((p) => p.tamanho)),
    [produtosRef, colecao, cor]
  );

  const candidatos = useMemo(
    () => colecao && cor && tamanho ? produtosRef.filter((p) => p.colecao === colecao && p.cor === cor && p.tamanho === tamanho) : [],
    [produtosRef, colecao, cor, tamanho]
  );

  const produtoSelecionado = candidatos.length === 1 ? candidatos[0] : null;
  const erroCombinacao =
  colecao && cor && tamanho ?
  candidatos.length === 0 ?
  'Produto não encontrado para a combinação selecionada.' :
  candidatos.length > 1 ?
  'Foi encontrado mais de um SKU para esta combinação. A solicitação não pode continuar até que a base seja corrigida.' :
  null :
  null;

  const adicionarItem = () => {
    setErro(null);
    if (!produtoSelecionado) {
      setErro('Selecione referência, coleção, cor e tamanho válidos antes de adicionar.');
      return;
    }
    const qtd = Number(quantidade);
    if (!quantidade.trim() || Number.isNaN(qtd) || !Number.isInteger(qtd) || qtd <= 0) {
      setErro('Informe uma quantidade inteira maior que zero.');
      return;
    }
    if (itens.some((i) => i.produto.sku === produtoSelecionado.sku)) {
      setErro(`O SKU ${produtoSelecionado.sku} já foi adicionado nesta solicitação.`);
      return;
    }
    if (!produtoSelecionado.ean13) {
      setErro(`O SKU ${produtoSelecionado.sku} não possui EAN13 na base de produtos.`);
      return;
    }
    setItens([...itens, { produto: produtoSelecionado, quantidade: qtd }]);
    limparSelecao();
  };

  const removerItem = (sku: string) => setItens(itens.filter((i) => i.produto.sku !== sku));
  const alterarQuantidade = (sku: string, valor: string) => {
    const qtd = Number(valor);
    setItens(itens.map((i) => i.produto.sku === sku ? { ...i, quantidade: Number.isNaN(qtd) ? 0 : qtd } : i));
  };

  const totalTags = itens.reduce((acc, i) => acc + (i.quantidade || 0), 0);

  const confirmar = async () => {
    setErro(null);
    if (!supabase || !user) return;
    if (itens.length === 0) {
      setErro('Adicione ao menos um item antes de confirmar.');
      return;
    }
    for (const i of itens) {
      if (!Number.isInteger(i.quantidade) || i.quantidade <= 0) {
        setErro(`Quantidade inválida no SKU ${i.produto.sku}.`);
        return;
      }
    }
    setSalvando(true);
    const { data: solicitacao, error: erroRequest } = await supabase.
    from('requests').
    insert({ usuario_id: user.id, numero: '', status: 'SOLICITADA' }).
    select('id, numero').
    single();
    if (erroRequest || !solicitacao) {
      setErro(erroRequest?.message ?? 'Não foi possível criar a solicitação.');
      setSalvando(false);
      return;
    }
    const registros = itens.map((i) => ({
      request_id: solicitacao.id,
      product_id: i.produto.id,
      referencia: i.produto.referencia,
      sku: i.produto.sku,
      ean13: i.produto.ean13,
      nome: i.produto.nome,
      grupo: i.produto.grupo,
      colecao: i.produto.colecao,
      cor: i.produto.cor,
      tamanho: i.produto.tamanho,
      preco: i.produto.preco,
      unidade: i.produto.unidade,
      quantidade: i.quantidade
    }));
    const { error: erroItens } = await supabase.from('request_items').insert(registros);
    if (erroItens) {
      await supabase.from('requests').delete().eq('id', solicitacao.id);
      setErro(`Não foi possível salvar os itens: ${erroItens.message}`);
      setSalvando(false);
      return;
    }
    await registrarHistorico(solicitacao.id, user.id, 'Criação', `Solicitação ${solicitacao.numero} criada com ${itens.length} item(ns).`);
    if (chaveRascunho) localStorage.removeItem(chaveRascunho);
    setSalvando(false);
    navigate(`/solicitacoes/${solicitacao.id}`);
  };

  return (
    <div data-ev-id="ev_0f87b2cab7" className="flex flex-col gap-4">
			<PageHeader titulo="Nova Solicitação" descricao="Informe referência, coleção, cor, tamanho e quantidade." />
			{rascunhoRestaurado ?
      <div data-ev-id="ev_rascunho_aviso" role="status" className="flex flex-row flex-wrap items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
					<span>Recuperamos a solicitação que você estava preenchendo.</span>
					<Button variant="outline" onClick={descartarRascunho}>Descartar rascunho</Button>
				</div> :
      null}
			{erro ? <Alert tipo="erro">{erro}</Alert> : null}

			<Card>
				<CardHeader titulo="Adicionar item" descricao="Os campos mostram apenas opções válidas. SKU e EAN são identificados automaticamente." />
				<div data-ev-id="ev_73e3ba9059" className="flex flex-col gap-4 px-5 py-4">
					<div data-ev-id="ev_cecb7b7cb2" className="grid grid-cols-1 gap-4 md:grid-cols-5">
						<div data-ev-id="ev_62e858d05a" className="relative md:col-span-2">
							<Field label="Referência">
								<div data-ev-id="ev_cb6d612315" className="flex flex-row gap-2">
									<input data-ev-id="ev_0967a83b88" className={inputClass} value={busca} disabled={!!referencia} placeholder="Digite a referência" onChange={(e) => setBusca(e.target.value)} />
									{referencia ?
                  <Button variant="outline" onClick={limparSelecao} title="Limpar">
											<X className="h-4 w-4" />
										</Button> :
                  null}
								</div>
							</Field>
							{sugestoes.length > 0 ?
              <ul data-ev-id="ev_18769fc88f" className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-white shadow-lg">
									{sugestoes.map((s) =>
                <li data-ev-id="ev_ab4ae97b50" key={s}>
											<button data-ev-id="ev_e6fbce6609" type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => void selecionarReferencia(s)}>
												{s}
											</button>
										</li>
                )}
								</ul> :
              null}
						</div>
						<Field label="Coleção">
							<select data-ev-id="ev_8f88c6639e" className={inputClass} value={colecao} disabled={!referencia} onChange={(e) => {setColecao(e.target.value);setCor('');setTamanho('');}}>
								<option data-ev-id="ev_647c205d02" value="">Selecione</option>
								{colecoes.map((c) => <option data-ev-id="ev_68b41d50ac" key={c} value={c}>{c}</option>)}
							</select>
						</Field>
						<Field label="Cor">
							<select data-ev-id="ev_8e8bf6ab8d" className={inputClass} value={cor} disabled={!colecao} onChange={(e) => {setCor(e.target.value);setTamanho('');}}>
								<option data-ev-id="ev_33c83fb79b" value="">Selecione</option>
								{cores.map((c) => <option data-ev-id="ev_9a6de51a0e" key={c} value={c}>{c}</option>)}
							</select>
						</Field>
						<Field label="Tamanho">
							<select data-ev-id="ev_fad0a68501" className={inputClass} value={tamanho} disabled={!cor} onChange={(e) => setTamanho(e.target.value)}>
								<option data-ev-id="ev_a14e3bffb0" value="">Selecione</option>
								{tamanhos.map((t) => <option data-ev-id="ev_50f6a66fff" key={t} value={t}>{t}</option>)}
							</select>
						</Field>
					</div>
					{erroCombinacao ? <Alert tipo="erro" titulo="Solicitação bloqueada">{erroCombinacao}</Alert> : null}
					{produtoSelecionado ?
          <div data-ev-id="ev_333bc3f685" className="flex flex-col gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3">
							<div data-ev-id="ev_646a3ca981" className="flex flex-row items-center gap-2 text-sm font-medium text-green-800"><Check className="h-4 w-4" /> Produto identificado</div>
							<div data-ev-id="ev_8e63873c93" className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
								<Info titulo="SKU" valor={produtoSelecionado.sku} />
								<Info titulo="EAN13" valor={produtoSelecionado.ean13 ?? '-'} />
								<Info titulo="Nome" valor={produtoSelecionado.nome ?? '-'} />
								<Info titulo="Grupo" valor={produtoSelecionado.grupo ?? '-'} />
							</div>
						</div> :
          null}
					<div data-ev-id="ev_699838f18a" className="flex flex-row flex-wrap items-end gap-3">
						<div data-ev-id="ev_c8610a4692" className="w-40">
							<Field label="Quantidade">
								<input data-ev-id="ev_c02b62a8f9" className={inputClass} type="number" min={1} step={1} value={quantidade} disabled={!produtoSelecionado} onChange={(e) => setQuantidade(e.target.value)} />
							</Field>
						</div>
						<Button onClick={adicionarItem} disabled={!produtoSelecionado}><Plus className="h-4 w-4" /> Adicionar</Button>
					</div>
				</div>
			</Card>

			<Card>
				<CardHeader titulo="Itens da solicitação" descricao={`${itens.length} item(ns) — ${formatNumber(totalTags)} tag(s)`} />
				{itens.length === 0 ? <Empty texto="Nenhum item adicionado." /> :
        <div data-ev-id="ev_827803cdd9" className="overflow-x-auto">
						<table data-ev-id="ev_422f0faabc" className="w-full text-sm">
							<thead data-ev-id="ev_0e6011e154" className="bg-muted text-left text-xs uppercase text-muted-foreground">
								<tr data-ev-id="ev_529ac0f941">
									<th data-ev-id="ev_193b177083" className="px-4 py-2">Ref.</th>
									<th data-ev-id="ev_cadf34282f" className="px-4 py-2">Coleção</th>
									<th data-ev-id="ev_14328bc5ca" className="px-4 py-2">Cor</th>
									<th data-ev-id="ev_431aaffbee" className="px-4 py-2">Tam.</th>
									<th data-ev-id="ev_c82fbb447f" className="px-4 py-2">SKU</th>
									<th data-ev-id="ev_5edc37cd86" className="px-4 py-2">EAN13</th>
									<th data-ev-id="ev_d3957bd4a0" className="px-4 py-2">Qtd.</th>
									<th data-ev-id="ev_26addeb47c" className="px-4 py-2"></th>
								</tr>
							</thead>
							<tbody data-ev-id="ev_964a63ced2" className="divide-y divide-border">
								{itens.map((i) =>
              <tr data-ev-id="ev_491e7433dc" key={i.produto.sku}>
										<td data-ev-id="ev_844d7f7348" className="px-4 py-2 font-medium">{i.produto.referencia}</td>
										<td data-ev-id="ev_d703837a7e" className="px-4 py-2">{i.produto.colecao ?? '-'}</td>
										<td data-ev-id="ev_d67e195be8" className="px-4 py-2">{i.produto.cor ?? '-'}</td>
										<td data-ev-id="ev_173bba3819" className="px-4 py-2">{i.produto.tamanho ?? '-'}</td>
										<td data-ev-id="ev_3acecabe2a" className="px-4 py-2">{i.produto.sku}</td>
										<td data-ev-id="ev_7222fa89df" className="px-4 py-2">{i.produto.ean13 ?? '-'}</td>
										<td data-ev-id="ev_5ef8393a40" className="px-4 py-2">
											<input data-ev-id="ev_4aa9aba60e" className={`${inputClass} w-20`} type="number" min={1} value={i.quantidade} onChange={(e) => alterarQuantidade(i.produto.sku, e.target.value)} />
										</td>
										<td data-ev-id="ev_fd0dd7fa73" className="px-4 py-2">
											<Button variant="ghost" onClick={() => removerItem(i.produto.sku)} title="Remover"><Trash2 className="h-4 w-4 text-red-600" /></Button>
										</td>
									</tr>
              )}
							</tbody>
						</table>
					</div>
        }
				<div data-ev-id="ev_04907e1c09" className="flex flex-row justify-end gap-2 border-t border-border px-5 py-4">
					<Button onClick={confirmar} disabled={itens.length === 0} loading={salvando}>Confirmar solicitação</Button>
				</div>
			</Card>
		</div>);

}
