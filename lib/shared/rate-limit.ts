type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export function checkRateLimit(
  key: string, 
  config: RateLimitConfig
): RateLimitResult {
  cleanup();
  
  const now = Date.now();
  const entry = store.get(key);
  
  if (!entry || entry.resetTime < now) {
    store.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetTime: now + config.windowMs };
  }
  
  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetTime: entry.resetTime };
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'anonymous';
}

export const RATE_LIMITS = {
  sync: { windowMs: 60 * 1000, max: 5 },
  analysis: { windowMs: 60 * 1000, max: 10 },
  api: { windowMs: 60 * 1000, max: 100 },
} as const;
