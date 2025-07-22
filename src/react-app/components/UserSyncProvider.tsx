import { ReactNode } from 'react';
import { useUserSync } from '../hooks/useUserSync';

interface UserSyncProviderProps {
  children: ReactNode;
}

export function UserSyncProvider({ children }: UserSyncProviderProps) {
  useUserSync(); // Este hook se encargará de la sincronización

  return <>{children}</>;
} 