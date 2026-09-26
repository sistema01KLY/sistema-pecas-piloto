import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { Tag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Alert, Button, Field, inputClass, Spinner } from '../components/ui';

export default function Login() {
  const { user, loading, entrar, cadastrar, configurado } = useAuth();
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setErro(null);
    setMensagem(null);
  }, [modo]);

  if (loading) return <Spinner texto="Carregando..." />;
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagem(null);
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.');
      return;
    }
    setEnviando(true);
    if (modo === 'entrar') {
      const { error } = await entrar(email.trim(), senha);
      if (error) setErro(error);
    } else {
      if (!nome.trim()) {
        setErro('Informe seu nome.');
        setEnviando(false);
        return;
      }
      const { error, precisaConfirmar } = await cadastrar(nome.trim(), email.trim(), senha);
      if (error) setErro(error);else
      if (precisaConfirmar) setMensagem('Cadastro realizado. Confirme seu e-mail para acessar o sistema.');
    }
    setEnviando(false);
  };

  return (
    <div data-ev-id="ev_4168e86496" className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
			<div data-ev-id="ev_0f73d05b36" className="flex w-full max-w-md flex-col gap-6 rounded-xl border border-border bg-white p-8 shadow-sm">
				<div data-ev-id="ev_b6daed14f7" className="flex flex-col items-center gap-2 text-center">
					<div data-ev-id="ev_17a6a5061d" className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
						<Tag className="h-6 w-6 text-accent" />
					</div>
					<h1 data-ev-id="ev_d27ddaed5a" className="text-lg font-semibold text-slate-900">Sistema de Solicitação de Tags EPC</h1>
					<p data-ev-id="ev_6b706e4c85" className="text-sm text-muted-foreground">Piloto — acesso restrito a usuários internos</p>
				</div>

				{!configurado ? <Alert tipo="erro" titulo="Backend indisponível">O banco de dados ainda não está configurado.</Alert> : null}
				{erro ? <Alert tipo="erro">{erro}</Alert> : null}
				{mensagem ? <Alert tipo="sucesso">{mensagem}</Alert> : null}

				<form data-ev-id="ev_627a11c056" onSubmit={onSubmit} className="flex flex-col gap-4">
					{modo === 'cadastrar' ?
          <Field label="Nome">
							<input data-ev-id="ev_5b0c4956dd" className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
						</Field> :
          null}
					<Field label="E-mail">
						<input data-ev-id="ev_9c080cc806" className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com.br" />
					</Field>
					<Field label="Senha" hint={modo === 'cadastrar' ? 'Mínimo de 6 caracteres.' : undefined}>
						<input data-ev-id="ev_6f851ee9e3" className={inputClass} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
					</Field>
					<Button type="submit" loading={enviando} className="w-full">
						{modo === 'entrar' ? 'Entrar' : 'Criar conta'}
					</Button>
				</form>

				<button data-ev-id="ev_52b5b6aa00" type="button" className="text-sm text-primary hover:underline" onClick={() => setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')}>
					{modo === 'entrar' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
				</button>
			</div>
		</div>);

}