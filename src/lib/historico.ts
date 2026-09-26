import { supabase } from '@/integrations/supabase/client';

export async function registrarHistorico(requestId: string, usuarioId: string, acao: string, detalhes?: string): Promise<void> {
	if (!supabase) return;
	await supabase.from('request_history').insert({ request_id: requestId, usuario_id: usuarioId, acao, detalhes: detalhes ?? null });
}
