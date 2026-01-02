import { NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/auth/config';

/**
 * POST /api/admin/cleanup
 * Clean up expired sessions and reset tokens
 * 
 * This endpoint should be called periodically via:
 * - A cron job (e.g., every hour)
 * - Vercel Cron Jobs
 * - An external scheduler
 * 
 * Security: Protected by a secret key in the Authorization header
 * or by calling from a trusted internal source
 */
export async function POST(request: Request) {
  // Check for admin secret in production
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.ADMIN_SECRET;
  
  // In development, allow without secret
  // In production, require the secret
  if (process.env.NODE_ENV === 'production' && expectedSecret) {
    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }
  }

  try {
    // Clean up expired sessions
    const deletedSessions = await cleanupExpiredSessions();
    
    // Log the cleanup (useful for monitoring)
    console.log(`[Cleanup] Deleted ${deletedSessions} expired sessions`);

    return NextResponse.json({
      success: true,
      deletedSessions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /api/admin/cleanup error:', error);
    
    return NextResponse.json(
      { error: 'Cleanup failed', code: 'CLEANUP_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/cleanup
 * Check cleanup status (health check)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Cleanup endpoint is available. Send POST request to run cleanup.',
  });
}
