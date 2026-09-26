export type RequestStatus =
  | 'SOLICITADA'
  | 'EM_PROCESSAMENTO'
  | 'ARQUIVO_EPC_GERADO'
  | 'EPCS_RECEBIDOS'
  | 'CONCLUIDA'
  | 'ERRO';

export const STATUS_LABEL: Record<RequestStatus, string> = {
  SOLICITADA: 'Solicitada',
  EM_PROCESSAMENTO: 'Em processamento',
  ARQUIVO_EPC_GERADO: 'Arquivo EPC gerado',
  EPCS_RECEBIDOS: 'EPCs recebidos',
  CONCLUIDA: 'Concluída',
  ERRO: 'Erro',
};

export const STATUS_CLASS: Record<RequestStatus, string> = {
  SOLICITADA: 'bg-slate-100 text-slate-700 border-slate-200',
  EM_PROCESSAMENTO: 'bg-blue-50 text-blue-700 border-blue-200',
  ARQUIVO_EPC_GERADO: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  EPCS_RECEBIDOS: 'bg-amber-50 text-amber-800 border-amber-200',
  CONCLUIDA: 'bg-green-50 text-green-700 border-green-200',
  ERRO: 'bg-red-50 text-red-700 border-red-200',
};
