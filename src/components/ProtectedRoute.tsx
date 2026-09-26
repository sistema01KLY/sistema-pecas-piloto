import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Alert, Spinner } from '@/components/ui';

export default function ProtectedRoute({ children, somenteAdmin = false }: { children: ReactNode; somenteAdmin?: boolean }) {
  const { user, loading, isAdmin, perfil } = useAuth();

  if (loading) return <Spinner texto="Verificando acesso..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (somenteAdmin && !perfil) return <Spinner texto="Carregando permissões..." />;

  if (somenteAdmin && !isAdmin) {
    return (
      <Layout>
        <Alert tipo="erro" titulo="Acesso restrito">
          Esta área é exclusiva para administradores.
        </Alert>
      </Layout>
    );
  }

  return <Layout>{children}</Layout>;
}
