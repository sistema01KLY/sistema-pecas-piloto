import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface NewRequestNotice {
  id: string;
  numero: string;
  created_at: string;
  read: boolean;
}

export default function AdminRequestNotifications() {
  const { isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<NewRequestNotice[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const seenRequestIds = useRef(new Set<string>());

  useEffect(() => {
    if (!isAdmin || !supabase) {
      seenRequestIds.current.clear();
      setNotifications([]);
      setAlertMessage(null);
      setIsOpen(false);
      return;
    }

    const client = supabase;
    let active = true;
    let lastCheckedAt = new Date().toISOString();
    seenRequestIds.current.clear();
    setNotifications([]);
    setAlertMessage(null);

    const checkForNewRequests = async () => {
      const pollStartedAt = new Date().toISOString();
      const { data, error } = await client
        .from('requests')
        .select('id, numero, created_at')
        .gte('created_at', lastCheckedAt)
        .order('created_at', { ascending: true });

      if (!active || error || !data) return;

      const newNotices = data
        .filter((request) => !seenRequestIds.current.has(request.id))
        .map((request) => {
          seenRequestIds.current.add(request.id);
          return {
            id: request.id,
            numero: request.numero,
            created_at: request.created_at,
            read: false,
          };
        });

      if (newNotices.length > 0) {
        setNotifications((current) => [...newNotices, ...current].slice(0, 20));
        setAlertMessage(
          newNotices.length === 1
            ? `Nova solicitação cadastrada: ${newNotices[0].numero}`
            : `${newNotices.length} novas solicitações cadastradas`,
        );
      }

      lastCheckedAt = pollStartedAt;
    };

    void checkForNewRequests();
    const intervalId = window.setInterval(() => void checkForNewRequests(), 15000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      seenRequestIds.current.clear();
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const toggleNotifications = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) {
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    }
  };

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={toggleNotifications}
        aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-slate-700 shadow-md transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {alertMessage ? (
        <div role="status" aria-live="polite" className="flex max-w-sm items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-md">
          <span>{alertMessage}</span>
          <button
            type="button"
            onClick={() => setAlertMessage(null)}
            aria-label="Dispensar aviso"
            className="rounded p-1 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {isOpen ? (
        <section
          aria-label="Novas solicitações"
          className="absolute right-0 top-12 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Novas solicitações</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar notificações"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma nova solicitação.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    to={`/solicitacoes/${notification.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex flex-col gap-1 px-4 py-3 transition hover:bg-slate-50 focus:outline-none focus:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-900">{notification.numero}</span>
                    <time className="text-xs text-muted-foreground" dateTime={notification.created_at}>
                      {new Date(notification.created_at).toLocaleString('pt-BR')}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
