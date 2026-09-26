import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui';

export default function Index() {
	const { user, loading, isAdmin, perfil } = useAuth();

	if (loading) return <Spinner texto="Carregando..." />;
	if (!user) return <Navigate to="/login" replace />;
	if (!perfil) return <Spinner texto="Carregando permissões..." />;

	return <Navigate to={isAdmin ? '/dashboard' : '/nova-solicitacao'} replace />;
}
