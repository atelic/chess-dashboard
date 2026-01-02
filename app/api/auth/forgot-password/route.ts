import { NextResponse } from 'next/server';
import { createUserService } from '@/lib/infrastructure/factories';
import { sendPasswordResetEmail } from '@/lib/email/resend';
import { checkRateLimit, AUTH_RATE_LIMITS } from '@/lib/auth/rate-limit';

/**
 * POST /api/auth/forgot-password
 * Request a password reset token
 * 
 * Body:
 * - email: string (required)
 * 
 * Sends password reset email via Resend if configured.
 * Falls back to console logging in development.
 * 
 * Rate limited: 3 requests per 15 minutes per IP
 */
export async function POST(request: Request) {
  // Check rate limit
  const rateLimitResponse = checkRateLimit(request, AUTH_RATE_LIMITS.forgotPassword);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required', code: 'VALIDATION_ERROR', field: 'email' },
        { status: 400 },
      );
    }

    const userService = await createUserService();
    const token = await userService.requestPasswordReset(body.email.trim());

    if (token) {
      // Send password reset email
      await sendPasswordResetEmail(body.email.trim(), token);
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error);

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }
}
