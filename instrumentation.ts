/**
 * Next.js Instrumentation
 * 
 * This file is loaded once when the Next.js server starts.
 * Use it for one-time initialization tasks like starting background jobs.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import to avoid Edge runtime issues
    const { startSessionCleanup } = await import('@/lib/auth/config');
    
    // Start automatic session cleanup
    startSessionCleanup();
  }
}
