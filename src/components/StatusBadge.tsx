import { STATUS_CLASS, STATUS_LABEL, type RequestStatus } from '@/lib/status';

export function StatusBadge({ status }: {status: RequestStatus;}) {
  return (
    <span data-ev-id="ev_26b344cb9b" className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>);

}