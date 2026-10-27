import type { WorkerInfo } from '../../shared/protocol';
import { toast } from '../ui/dom';

/** The server authorizes every request; this keeps private desks from offering unusable controls. */
export function privateSession(worker: WorkerInfo | undefined): boolean {
  if (!worker?.private) return false;
  toast(`🔒 ${worker.createdBy}'s private session`, 'info');
  return true;
}
