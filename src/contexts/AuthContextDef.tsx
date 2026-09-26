import { createContext } from 'react';

export type Perfil = {
  id?: string;
  nome?: string;
  email?: string;
  admin?: boolean;
};

export type AuthContextValue = {
  user: { id: string; email?: string } | null;
  loading: boolean;
  perfil: Perfil | null;
  isAdmin: boolean;
  configurado: boolean;
  entrar: (email: string, senha: string) => Promise<{ error?: string; precisaConfirmar?: boolean }>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<{ error?: string; precisaConfirmar?: boolean }>;
  sair: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
