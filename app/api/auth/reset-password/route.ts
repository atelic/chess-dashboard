import { NextResponse } from 'next/server';
import { createUserService } from '@/lib/infrastructure/factories';
import { AppError, InvalidResetTokenError } from '@/lib/shared/errors';
import { checkRateLimit, AUTH_RATE_LIMITS } from '@/lib/auth/rate-limit';

/**
 * POST /api/auth/reset-password
 * Reset password using a reset token
 * 
 * Body:
 * - token: string (required)
 * - password: string (required)
 * 
 * Rate limited: 5 requests per 15 minutes per IP
 */
export async function POST(request: Request) {
  // Check rate limit
  const rateLimitResponse = checkRateLimit(request, AUTH_RATE_LIMITS.resetPassword);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json(
        { error: 'Reset token is required', code: 'VALIDATION_ERROR', field: 'token' },
        { status: 400 },
      );
    }

    if (!body.password || typeof body.password !== 'string') {
      return NextResponse.json(
        { error: 'New password is required', code: 'VALIDATION_ERROR', field: 'password' },
        { status: 400 },
      );
    }

    const userService = await createUserService();
    await userService.resetPassword(body.token, body.password);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error);

    if (error instanceof InvalidResetTokenError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
