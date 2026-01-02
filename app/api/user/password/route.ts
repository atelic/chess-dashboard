import { NextResponse } from 'next/server';
import { createUserService } from '@/lib/infrastructure/factories';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { AppError, PasswordMismatchError, UnauthorizedError } from '@/lib/shared/errors';
import { checkRateLimit, AUTH_RATE_LIMITS } from '@/lib/auth/rate-limit';

/**
 * PUT /api/user/password
 * Change password for the authenticated user
 * 
 * Body:
 * - currentPassword: string (required)
 * - newPassword: string (required)
 * 
 * Rate limited: 5 requests per hour per user
 */
export async function PUT(request: Request) {
  try {
    // Get authenticated user from session
    const authUser = await getAuthenticatedUser();

    // Check rate limit using user ID instead of IP
    const rateLimitResponse = checkRateLimit(
      request, 
      AUTH_RATE_LIMITS.changePassword,
      `user:${authUser.id}`
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    // Validate required fields
    if (!body.currentPassword || typeof body.currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Current password is required', code: 'VALIDATION_ERROR', field: 'currentPassword' },
        { status: 400 },
      );
    }

    if (!body.newPassword || typeof body.newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required', code: 'VALIDATION_ERROR', field: 'newPassword' },
        { status: 400 },
      );
    }

    const userService = await createUserService();
    await userService.changePassword(authUser.id, body.currentPassword, body.newPassword);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('PUT /api/user/password error:', error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 401 },
      );
    }

    if (error instanceof PasswordMismatchError) {
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
      { error: 'Failed to change password. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
