import { NavLink, useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { BarChart3, Boxes, FileInput, History, LogOut, Package, PlusCircle, ScrollText, Tag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export default function Layout({ children }: {children: ReactNode;}) {
  const { perfil, isAdmin, sair } = useAuth();
  const navigate = useNavigate();

  const itensSolicitante: NavItem[] = [
  { to: '/nova-solicitacao', label: 'Nova Solicitação', icon: <PlusCircle className="h-4 w-4" /> },
  { to: '/minhas-solicitacoes', label: 'Minhas Solicitações', icon: <ScrollText className="h-4 w-4" /> }];


  const itensAdmin: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
  { to: '/solicitacoes', label: 'Solicitações', icon: <Boxes className="h-4 w-4" /> },
  { to: '/produtos', label: 'Base de Produtos', icon: <Package className="h-4 w-4" /> },
  { to: '/importar-epcs', label: 'Importar EPCs', icon: <FileInput className="h-4 w-4" /> },
  { to: '/historico', label: 'Histórico', icon: <History className="h-4 w-4" /> }];


  const itens = isAdmin ? [...itensSolicitante, ...itensAdmin] : itensSolicitante;

  const handleSair = async () => {
    await sair();
    navigate('/login', { replace: true });
  };

  return (
    <div data-ev-id="ev_cdcb6cd2d3" className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
			<aside data-ev-id="ev_54f765c501" className="flex w-full shrink-0 flex-col gap-6 border-b border-border bg-secondary px-4 py-5 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
				<div data-ev-id="ev_576e813ac3" className="flex flex-row items-center gap-2 text-white">
					<Tag className="h-6 w-6 text-accent" />
					<div data-ev-id="ev_d23deb2c46" className="flex flex-col">
						<span data-ev-id="ev_79490bf66b" className="text-sm font-semibold leading-tight">Tags EPC</span>
						<span data-ev-id="ev_fb5c86981e" className="text-xs text-slate-400">Piloto</span>
					</div>
				</div>

				<nav data-ev-id="ev_d6bb5ab911" className="flex flex-col gap-1">
					{itens.map((item) =>
          <NavLink data-ev-id="ev_a6c1dc6ae1"
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
          `flex flex-row items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
          isActive ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`

          }>

							{item.icon}
							{item.label}
						</NavLink>
          )}
				</nav>

				<div data-ev-id="ev_e5047afb5b" className="mt-auto flex flex-col gap-2 border-t border-slate-700 pt-4">
					<div data-ev-id="ev_205896f92e" className="flex flex-col">
						<span data-ev-id="ev_07c82b50b5" className="truncate text-sm font-medium text-white">{perfil?.nome ?? perfil?.email ?? 'Usuário'}</span>
						<span data-ev-id="ev_bedd7ca572" className="text-xs text-slate-400">{isAdmin ? 'Administrador' : 'Solicitante'}</span>
					</div>
					<button data-ev-id="ev_b50199d790"
          type="button"
          onClick={handleSair}
          className="flex flex-row items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white">

						<LogOut className="h-4 w-4" /> Sair
					</button>
				</div>
			</aside>

			<main data-ev-id="ev_5b1b746f91" className="flex-1 overflow-x-auto px-4 py-6 lg:px-8">{children}</main>
		</div>);

}

export function PageHeader({ titulo, descricao, acoes }: {titulo: string;descricao?: string;acoes?: ReactNode;}) {
  return (
    <div data-ev-id="ev_bee2364a85" className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<div data-ev-id="ev_68c27cf171" className="flex flex-col gap-1">
				<h1 data-ev-id="ev_aa993aa5a6" className="text-xl font-semibold text-slate-900">{titulo}</h1>
				{descricao ? <p data-ev-id="ev_1b5fea7524" className="text-sm text-muted-foreground">{descricao}</p> : null}
			</div>
			{acoes ? <div data-ev-id="ev_93edcb3755" className="flex flex-row flex-wrap gap-2">{acoes}</div> : null}
		</div>);

}