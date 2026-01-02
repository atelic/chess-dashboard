import { NextResponse } from 'next/server';
import { createUserService } from '@/lib/infrastructure/factories';
import { AppError, ValidationError, EmailExistsError } from '@/lib/shared/errors';
import { sendWelcomeEmail } from '@/lib/email/resend';
import { checkRateLimit, AUTH_RATE_LIMITS } from '@/lib/auth/rate-limit';

/**
 * POST /api/auth/register
 * Register a new user with email and password
 * 
 * Body:
 * - email: string (required)
 * - password: string (required)
 * - chesscomUsername: string (optional)
 * - lichessUsername: string (optional)
 * 
 * Rate limited: 3 requests per 10 minutes per IP
 */
export async function POST(request: Request) {
  // Check rate limit
  const rateLimitResponse = checkRateLimit(request, AUTH_RATE_LIMITS.register);
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

    if (!body.password || typeof body.password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required', code: 'VALIDATION_ERROR', field: 'password' },
        { status: 400 },
      );
    }

    const userService = await createUserService();
    const user = await userService.registerUser({
      email: body.email.trim(),
      password: body.password,
      chesscomUsername: body.chesscomUsername?.trim() || null,
      lichessUsername: body.lichessUsername?.trim() || null,
    });

    // Send welcome email (non-blocking, don't fail registration if email fails)
    sendWelcomeEmail(user.email!).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        chesscomUsername: user.chesscomUsername,
        lichessUsername: user.lichessUsername,
      },
    });
  } catch (error) {
    console.error('POST /api/auth/register error:', error);

    if (error instanceof EmailExistsError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 },
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, field: error.field },
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
      { error: 'Registration failed. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
