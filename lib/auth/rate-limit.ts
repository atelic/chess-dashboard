import { NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter for auth endpoints
 * 
 * In production, consider using:
 * - Redis for distributed rate limiting
 * - Upstash Rate Limit for serverless
 * - Cloudflare Rate Limiting at the edge
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory
// Note: This works for single-server deployments
// For distributed systems, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limit configuration for different endpoints
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional: Identifier prefix for this limiter */
  prefix?: string;
}

/**
 * Default rate limit configurations
 */
export const AUTH_RATE_LIMITS = {
  /** Login attempts: 5 per minute per IP */
  login: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    prefix: 'login',
  },
  /** Registration: 3 per 10 minutes per IP */
  register: {
    maxRequests: 3,
    windowMs: 10 * 60 * 1000,
    prefix: 'register',
  },
  /** Password reset request: 3 per 15 minutes per IP */
  forgotPassword: {
    maxRequests: 3,
    windowMs: 15 * 60 * 1000,
    prefix: 'forgot',
  },
  /** Password reset submission: 5 per 15 minutes per IP */
  resetPassword: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    prefix: 'reset',
  },
  /** Password change: 5 per hour per user */
  changePassword: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    prefix: 'change',
  },
} as const;

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header if behind a proxy, otherwise falls back to a default
 */
function getClientId(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Get the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback for direct connections (local development)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  
  // Last resort - shouldn't happen in production
  return 'unknown';
}

/**
 * Check if a request should be rate limited
 * 
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @param identifier - Optional custom identifier (e.g., user ID instead of IP)
 * @returns null if allowed, or a NextResponse if rate limited
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  identifier?: string,
): NextResponse | null {
  cleanupExpiredEntries();
  
  const clientId = identifier || getClientId(request);
  const key = config.prefix ? `${config.prefix}:${clientId}` : clientId;
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // First request or window expired - create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return null;
  }
  
  // Increment count
  entry.count++;
  
  if (entry.count > config.maxRequests) {
    // Rate limited
    const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
    
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
        },
      },
    );
  }
  
  // Request allowed
  return null;
}

/**
 * Higher-order function to wrap an API route handler with rate limiting
 */
export function withRateLimit(
  handler: (request: Request) => Promise<NextResponse>,
  config: RateLimitConfig,
) {
  return async (request: Request): Promise<NextResponse> => {
    const rateLimitResponse = checkRateLimit(request, config);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(request);
  };
}

/**
 * Reset rate limit for a specific key (useful for testing or admin actions)
 */
export function resetRateLimit(prefix: string, identifier: string): void {
  const key = `${prefix}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Get remaining requests for a specific key (useful for debugging)
 */
export function getRateLimitInfo(
  prefix: string,
  identifier: string,
  config: RateLimitConfig,
): { remaining: number; resetTime: number } | null {
  const key = `${prefix}:${identifier}`;
  const entry = rateLimitStore.get(key);
  
  if (!entry || Date.now() > entry.resetTime) {
    return { remaining: config.maxRequests, resetTime: 0 };
  }
  
  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

// ============================================
// LOGIN-SPECIFIC RATE LIMITING
// ============================================

// Failed login tracking (per email, not per IP)
// This prevents brute force attacks against specific accounts
const failedLoginStore = new Map<string, { count: number; lastAttempt: number }>();

/** Max failed attempts before lockout */
const MAX_FAILED_ATTEMPTS = 5;
/** Lockout duration in milliseconds (15 minutes) */
const LOCKOUT_DURATION = 15 * 60 * 1000;

/**
 * Check if login is rate limited for an email
 * Uses both IP-based and email-based rate limiting
 * 
 * @param email - The email being used to login
 * @returns Error message if rate limited, null if allowed
 */
export function checkLoginRateLimit(email: string): string | null {
  cleanupExpiredEntries();
  
  const entry = failedLoginStore.get(email.toLowerCase());
  if (!entry) return null;
  
  const now = Date.now();
  const timeSinceLastAttempt = now - entry.lastAttempt;
  
  // Reset if lockout period has passed
  if (timeSinceLastAttempt > LOCKOUT_DURATION) {
    failedLoginStore.delete(email.toLowerCase());
    return null;
  }
  
  // Check if locked out
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    const remainingMs = LOCKOUT_DURATION - timeSinceLastAttempt;
    const remainingMins = Math.ceil(remainingMs / 60000);
    return `Too many failed login attempts. Please try again in ${remainingMins} minute${remainingMins === 1 ? '' : 's'}.`;
  }
  
  return null;
}

/**
 * Record a failed login attempt
 * 
 * @param email - The email that failed to login
 */
export function recordFailedLogin(email: string): void {
  const key = email.toLowerCase();
  const entry = failedLoginStore.get(key);
  const now = Date.now();
  
  if (!entry || now - entry.lastAttempt > LOCKOUT_DURATION) {
    // First failed attempt or lockout expired
    failedLoginStore.set(key, { count: 1, lastAttempt: now });
  } else {
    // Increment failed attempts
    entry.count++;
    entry.lastAttempt = now;
  }
}

/**
 * Clear failed login attempts (call after successful login)
 * 
 * @param email - The email to clear
 */
export function clearFailedLogins(email: string): void {
  failedLoginStore.delete(email.toLowerCase());
}
