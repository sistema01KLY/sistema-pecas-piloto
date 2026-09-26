import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';

export function Card({ children, className = '' }: {children: ReactNode;className?: string;}) {
  return <div data-ev-id="ev_492b8d30eb" className={`rounded-lg border border-border bg-white shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({ titulo, descricao, acao }: {titulo: string;descricao?: string;acao?: ReactNode;}) {
  return (
    <div data-ev-id="ev_32de7ec899" className="flex flex-row items-start justify-between gap-4 border-b border-border px-5 py-4">
			<div data-ev-id="ev_731ad96fe5" className="flex flex-col gap-1">
				<h2 data-ev-id="ev_5c2af8b630" className="text-base font-semibold text-slate-900">{titulo}</h2>
				{descricao ? <p data-ev-id="ev_f986cdd046" className="text-sm text-muted-foreground">{descricao}</p> : null}
			</div>
			{acao}
		</div>);

}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
  title









}: {children: ReactNode;onClick?: () => void;type?: 'button' | 'submit';variant?: ButtonVariant;disabled?: boolean;loading?: boolean;className?: string;title?: string;}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-blue-800',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-slate-800',
    outline: 'border border-border bg-white text-slate-700 hover:bg-muted',
    danger: 'bg-destructive text-destructive-foreground hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-muted'
  };
  return (
    <button data-ev-id="ev_1a05770e88" type={type} onClick={onClick} disabled={disabled || loading} title={title} className={`${base} ${variants[variant]} ${className}`}>
			{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
			{children}
		</button>);

}

export function Field({ label, children, hint }: {label: string;children: ReactNode;hint?: string;}) {
  return (
    <label data-ev-id="ev_4588506a76" className="flex flex-col gap-1.5">
			<span data-ev-id="ev_bd8d6bb5a4" className="text-sm font-medium text-slate-700">{label}</span>
			{children}
			{hint ? <span data-ev-id="ev_b3ee61f78b" className="text-xs text-muted-foreground">{hint}</span> : null}
		</label>);

}

export const inputClass =
'w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-blue-100 disabled:bg-muted disabled:text-muted-foreground';

type AlertTipo = 'erro' | 'sucesso' | 'aviso' | 'info';

export function Alert({ tipo, titulo, children }: {tipo: AlertTipo;titulo?: string;children?: ReactNode;}) {
  const estilos: Record<AlertTipo, string> = {
    erro: 'border-red-200 bg-red-50 text-red-800',
    sucesso: 'border-green-200 bg-green-50 text-green-800',
    aviso: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900'
  };
  const icones: Record<AlertTipo, ReactNode> = {
    erro: <XCircle className="h-4 w-4 shrink-0" />,
    sucesso: <CheckCircle2 className="h-4 w-4 shrink-0" />,
    aviso: <AlertTriangle className="h-4 w-4 shrink-0" />,
    info: <Info className="h-4 w-4 shrink-0" />
  };
  return (
    <div data-ev-id="ev_5205823eca" className={`flex flex-row gap-3 rounded-md border px-4 py-3 text-sm ${estilos[tipo]}`}>
			<div data-ev-id="ev_7152661ac5" className="pt-0.5">{icones[tipo]}</div>
			<div data-ev-id="ev_b90c78cf04" className="flex flex-col gap-1">
				{titulo ? <strong data-ev-id="ev_78f58ca06e" className="font-semibold">{titulo}</strong> : null}
				{children}
			</div>
		</div>);

}

export function Spinner({ texto = 'Carregando...' }: {texto?: string;}) {
  return (
    <div data-ev-id="ev_fbf45ee453" className="flex flex-row items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
			<Loader2 className="h-4 w-4 animate-spin" /> {texto}
		</div>);

}

export function Empty({ texto }: {texto: string;}) {
  return <div data-ev-id="ev_99fde02bee" className="px-5 py-10 text-center text-sm text-muted-foreground">{texto}</div>;
}