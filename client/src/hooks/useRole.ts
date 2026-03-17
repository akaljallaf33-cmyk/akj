import { getWiRole } from '@/components/AuthGuard';

/**
 * Returns the current user's role and a helper to check if they are an admin.
 * - 'admin': full access (add, edit, delete jobs and oil prices)
 * - 'guest': read-only (can view all data and change the decline rate only)
 */
export function useRole() {
  const role = getWiRole();
  const isAdmin = role === 'admin';
  const isGuest = role === 'guest';
  return { role, isAdmin, isGuest };
}
