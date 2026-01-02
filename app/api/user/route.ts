import { NextResponse } from 'next/server';
import { createUserService } from '@/lib/infrastructure/factories';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { AppError, ValidationError, UnauthorizedError } from '@/lib/shared/errors';
import { validateOptionalUsername } from '@/lib/shared/validation';

/**
 * GET /api/user
 * Get the authenticated user's profile
 */
export async function GET() {
  try {
    // Get authenticated user from session
    const authUser = await getAuthenticatedUser();

    const userService = await createUserService();
    const user = await userService.getUserById(authUser.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        chesscomUsername: user.chesscomUsername,
        lichessUsername: user.lichessUsername,
        createdAt: user.createdAt.toISOString(),
        lastSyncedAt: user.lastSyncedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('GET /api/user error:', error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 401 },
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/user
 * Update the authenticated user's chess usernames
 */
export async function PUT(request: Request) {
  try {
    // Get authenticated user from session
    const authUser = await getAuthenticatedUser();

    const body = await request.json();
    
    // Validate usernames (allow null/empty, but validate format if provided)
    const chesscomUsername = validateOptionalUsername(body.chesscomUsername, 'chesscomUsername');
    const lichessUsername = validateOptionalUsername(body.lichessUsername, 'lichessUsername');

    // At least one username is required
    if (!chesscomUsername && !lichessUsername) {
      return NextResponse.json(
        { error: 'At least one username (Chess.com or Lichess) is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const userService = await createUserService();
    const user = await userService.updateUser(authUser.id, {
      chesscomUsername,
      lichessUsername,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        chesscomUsername: user.chesscomUsername,
        lichessUsername: user.lichessUsername,
        createdAt: user.createdAt.toISOString(),
        lastSyncedAt: user.lastSyncedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('PUT /api/user error:', error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 401 },
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
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/user
 * Delete the authenticated user and all associated data
 */
export async function DELETE() {
  try {
    // Get authenticated user from session
    const authUser = await getAuthenticatedUser();

    const userService = await createUserService();
    await userService.deleteUser(authUser.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/user error:', error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 401 },
      );
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
