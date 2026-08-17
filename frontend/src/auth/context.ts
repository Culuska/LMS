import { createContext } from 'react';
import type { AuthenticatedUser } from './types';

export interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Flips user.mustChangePassword to false locally after a successful change, so the
   * app doesn't force a full re-login just to pick up a flag the change-password call
   * already resolved server-side. */
  clearMustChangePassword: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
