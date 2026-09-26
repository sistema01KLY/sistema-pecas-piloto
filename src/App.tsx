/*
 * ⚠️ ROUTING RULES:
 * - Router is in main.tsx. Do NOT add another <BrowserRouter> here or anywhere.
 * - Use <Routes> + <Route> components ONLY.
 */
import { Routes, Route } from 'react-router';
import Index from './pages/Index';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import NovaSolicitacao from './pages/NovaSolicitacao';
import MinhasSolicitacoes from './pages/MinhasSolicitacoes';
import Solicitacoes from './pages/Solicitacoes';
import SolicitacaoDetalhe from './pages/SolicitacaoDetalhe';
import Dashboard from './pages/Dashboard';
import BaseProdutos from './pages/BaseProdutos';
import ImportarProdutos from './pages/ImportarProdutos';
import ImportarEpcs from './pages/ImportarEpcs';
import Historico from './pages/Historico';

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<Index />} />
			<Route path="/login" element={<Login />} />
			<Route path="/auth/callback" element={<AuthCallback />} />
			<Route
				path="/nova-solicitacao"
				element={
					<ProtectedRoute>
						<NovaSolicitacao />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/minhas-solicitacoes"
				element={
					<ProtectedRoute>
						<MinhasSolicitacoes />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/solicitacoes"
				element={
					<ProtectedRoute somenteAdmin>
						<Solicitacoes />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/solicitacoes/:id"
				element={
					<ProtectedRoute>
						<SolicitacaoDetalhe />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/dashboard"
				element={
					<ProtectedRoute somenteAdmin>
						<Dashboard />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/produtos"
				element={
					<ProtectedRoute somenteAdmin>
						<BaseProdutos />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/produtos/importar"
				element={
					<ProtectedRoute somenteAdmin>
						<ImportarProdutos />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/importar-epcs"
				element={
					<ProtectedRoute somenteAdmin>
						<ImportarEpcs />
					</ProtectedRoute>
				}
			/>
			<Route
				path="/historico"
				element={
					<ProtectedRoute somenteAdmin>
						<Historico />
					</ProtectedRoute>
				}
			/>
		</Routes>
	);
}
