import { NextResponse } from 'next/server';
import { createUserService } from '@/lib/infrastructure/factories';
import { AppError } from '@/lib/shared/errors';

/**
 * GET /api/user
 * Get the current user profile
 */
export async function GET() {
  try {
    const userService = createUserService();
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
    const { chesscomUsername, lichessUsername } = body;

    const userService = createUserService();

    // Check if user exists
    const existingUser = await userService.getCurrentUser();

    let user;
    if (existingUser) {
      // Update existing user
      user = await userService.updateUser(existingUser.id, {
        chesscomUsername: chesscomUsername || null,
        lichessUsername: lichessUsername || null,
      });
    } else {
      // Create new user
      user = await userService.createUser({
        chesscomUsername: chesscomUsername || null,
        lichessUsername: lichessUsername || null,
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
    const userService = createUserService();
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
