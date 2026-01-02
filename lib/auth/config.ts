import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { createUserService, getSessionRepository } from '@/lib/infrastructure/factories';
import type { NextAuthConfig } from 'next-auth';
import '@/lib/auth/types'; // Extend NextAuth types
import { checkLoginRateLimit, recordFailedLogin, clearFailedLogins } from './rate-limit';

/**
 * NextAuth configuration for email/password authentication
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;

        // Check rate limit for this email
        const rateLimitError = checkLoginRateLimit(email);
        if (rateLimitError) {
          // Throw error to be displayed on login page
          throw new Error(rateLimitError);
        }

        try {
          const userService = await createUserService();
          const user = await userService.verifyCredentials(
            email,
            credentials.password as string,
          );

          // Clear failed login attempts on success
          clearFailedLogins(email);

          // Return user object for session
          return {
            id: String(user.id),
            email: user.email!,
            name: user.chesscomUsername || user.lichessUsername || user.email,
            chesscomUsername: user.chesscomUsername,
            lichessUsername: user.lichessUsername,
          };
        } catch {
          // Record failed login attempt
          recordFailedLogin(email);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email ?? undefined;
        token.chesscomUsername = user.chesscomUsername;
        token.lichessUsername = user.lichessUsername;
      }

      // Handle session updates (e.g., after updating chess usernames)
      if (trigger === 'update' && session) {
        token.chesscomUsername = session.chesscomUsername;
        token.lichessUsername = session.lichessUsername;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.chesscomUsername = token.chesscomUsername as string | null;
        session.user.lichessUsername = token.lichessUsername as string | null;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Protected routes
      const protectedRoutes = ['/dashboard', '/settings', '/onboarding'];
      const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

      // Auth routes (should redirect if already logged in)
      const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
      const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

      if (isProtected && !isLoggedIn) {
        return false; // Redirect to login
      }

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', request.nextUrl));
      }

      return true;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * Clean up expired sessions periodically
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const sessionRepository = await getSessionRepository();
  return sessionRepository.deleteExpired();
}

// ============================================
// AUTOMATIC SESSION CLEANUP
// ============================================

let cleanupInterval: ReturnType<typeof setInterval> | null = null;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Start automatic session cleanup
 * Call this once when the application starts
 */
export function startSessionCleanup(): void {
  // Don't start if already running
  if (cleanupInterval) return;
  
  // Run cleanup immediately on start
  cleanupExpiredSessions()
    .then((count) => {
      if (count > 0) {
        console.log(`[SessionCleanup] Deleted ${count} expired sessions on startup`);
      }
    })
    .catch((err) => {
      console.error('[SessionCleanup] Error during startup cleanup:', err);
    });
  
  // Schedule periodic cleanup
  cleanupInterval = setInterval(async () => {
    try {
      const count = await cleanupExpiredSessions();
      if (count > 0) {
        console.log(`[SessionCleanup] Deleted ${count} expired sessions`);
      }
    } catch (err) {
      console.error('[SessionCleanup] Error during scheduled cleanup:', err);
    }
  }, CLEANUP_INTERVAL_MS);
  
  console.log('[SessionCleanup] Automatic session cleanup started (every hour)');
}

/**
 * Stop automatic session cleanup
 * Call this when the application is shutting down
 */
export function stopSessionCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[SessionCleanup] Automatic session cleanup stopped');
  }
}
