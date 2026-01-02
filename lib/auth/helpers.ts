import { auth } from '@/lib/auth/config';
import { UnauthorizedError } from '@/lib/shared/errors';
import '@/lib/auth/types';

export interface AuthenticatedUser {
  id: number;
  email: string;
  chesscomUsername: string | null;
  lichessUsername: string | null;
}

/**
 * Get the authenticated user from the session.
 * Throws UnauthorizedError if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  return {
    id: parseInt(session.user.id, 10),
    email: session.user.email!,
    chesscomUsername: session.user.chesscomUsername ?? null,
    lichessUsername: session.user.lichessUsername ?? null,
  };
}

/**
 * Get the authenticated user ID only.
 * Throws UnauthorizedError if not authenticated.
 */
export async function getAuthenticatedUserId(): Promise<number> {
  const user = await getAuthenticatedUser();
  return user.id;
}

/**
 * Check if the current request is authenticated.
 * Does not throw, returns null if not authenticated.
 */
export async function getOptionalUser(): Promise<AuthenticatedUser | null> {
  try {
    return await getAuthenticatedUser();
  } catch {
    return null;
  }
}
