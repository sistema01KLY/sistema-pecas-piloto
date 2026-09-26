import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, type AuthContextValue, type Perfil } from './AuthContextDef';
import { supabase } from '@/integrations/supabase/client';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [configurado, setConfigurado] = useState(true);

  const loadPerfil = async (userId: string) => {
    if (!supabase) {
      setPerfil(null);
      setConfigurado(false);
      return;
    }

    const { data, error } = await supabase.from('profiles').select('id, nome, email, admin').eq('id', userId).maybeSingle();
    console.log('PERFIL DO USUÁRIO:', data, 'admin:', data?.admin);
    if (!error && data) {
      setPerfil({
        id: data.id,
        nome: data.nome ?? data.email ?? 'Usu�rio',
        email: data.email ?? undefined,
        admin: Boolean(data.admin),
      });
      return;
    }

    setPerfil({ id: userId, nome: 'Usu�rio', email: undefined, admin: false });
  };

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      if (!supabase) {
        setConfigurado(false);
        setLoading(false);
        return;
      }

      const { data: sessionData, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        setConfigurado(false);
        setLoading(false);
        return;
      }

      const currentUser = sessionData.session?.user ?? null;
      setUser(currentUser ? { id: currentUser.id, email: currentUser.email ?? undefined } : null);

      if (currentUser) {
        await loadPerfil(currentUser.id);
      } else {
        setPerfil(null);
      }

      setConfigurado(true);
      setLoading(false);
    };

    void initialize();

    const authListener = supabase?.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser ? { id: nextUser.id, email: nextUser.email ?? undefined } : null);

      if (nextUser) {
        await loadPerfil(nextUser.id);
      } else {
        setPerfil(null);
      }
    });

    return () => {
      active = false;
      authListener?.data.subscription.unsubscribe();
    };
  }, []);

  const entrar = async (email: string, senha: string) => {
    if (!supabase) {
      return { error: 'Supabase n�o configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.' };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const cadastrar = async (nome: string, email: string, senha: string) => {
    if (!supabase) {
      return { error: 'Supabase n�o configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.' };
    }

    if (senha.length < 6) {
      return { error: 'A senha deve ter pelo menos 6 caracteres.' };
    }

    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
      },
    });

    if (authError) {
      return { error: authError.message };
    }

    if (authUser?.user && !authUser.session) {
      return { precisaConfirmar: true };
    }

    return {};
  };

  const sair = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setPerfil(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    perfil,
    isAdmin: Boolean(perfil?.admin),
    configurado,
    entrar,
    cadastrar,
    sair,
  }), [user, loading, perfil, configurado]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
