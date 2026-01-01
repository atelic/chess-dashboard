import { NextResponse } from 'next/server';
import { createUserService } from '@/lib/infrastructure/factories';
import { AppError, ValidationError } from '@/lib/shared/errors';
import { validateOptionalUsername } from '@/lib/shared/validation';

/**
 * GET /api/user
 * Get the current user profile
 */
export async function GET() {
  try {
    const userService = await createUserService();
    const user = await userService.getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        chesscomUsername: user.chesscomUsername,
        lichessUsername: user.lichessUsername,
        createdAt: user.createdAt.toISOString(),
        lastSyncedAt: user.lastSyncedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('GET /api/user error:', error);

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
 * POST /api/user
 * Create or update user profile
 */
export async function POST(request: Request) {
  try {
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

    // Check if user exists
    const existingUser = await userService.getCurrentUser();

    let user;
    if (existingUser) {
      // Update existing user
      user = await userService.updateUser(existingUser.id, {
        chesscomUsername,
        lichessUsername,
      });
    } else {
      // Create new user
      user = await userService.createUser({
        chesscomUsername,
        lichessUsername,
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        chesscomUsername: user.chesscomUsername,
        lichessUsername: user.lichessUsername,
        createdAt: user.createdAt.toISOString(),
        lastSyncedAt: user.lastSyncedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('POST /api/user error:', error);

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
 * Delete user and all associated data
 */
export async function DELETE() {
  try {
    const userService = await createUserService();
    const user = await userService.getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No user found', code: 'USER_NOT_FOUND' },
        { status: 404 },
      );
    }

    await userService.deleteUser(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/user error:', error);

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
