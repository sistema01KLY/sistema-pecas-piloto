import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '@/integrations/supabase/client';
import { Spinner } from '@/components/ui';

export default function AuthCallback() {
	const navigate = useNavigate();
	const [texto, setTexto] = useState('Validando acesso...');

	useEffect(() => {
		const run = async () => {
			if (!supabase) {
				navigate('/login', { replace: true });
				return;
			}
			await supabase.auth.getSession();
			setTexto('Redirecionando...');
			navigate('/', { replace: true });
		};
		void run();
	}, [navigate]);

	return <Spinner texto={texto} />;
}
