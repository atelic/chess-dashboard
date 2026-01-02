'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * NextAuth SessionProvider wrapper for client components
 */
export function AuthSessionProvider({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>;
}
