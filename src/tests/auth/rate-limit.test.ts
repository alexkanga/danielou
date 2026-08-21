/**
 * M1 Security Gate — Rate Limiting Tests
 * Tests du rate limiting sur le login Ghost.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it('allows requests under limit', () => {
    const result = checkRateLimit('192.168.1.1');
    expect(result.allowed).toBe(true);
  });

  it('blocks after MAX_ATTEMPTS (10)', () => {
    const ip = '192.168.1.2';
    // First 10 are allowed (each increments to 1..10)
    for (let i = 0; i < 9; i++) {
      expect(checkRateLimit(ip).allowed).toBe(true);
    }
    // The 10th call: count is already 9, increments to 10, then checks → blocked
    // Wait no — the check happens BEFORE the increment.
    // So calls 1-10 have count 0-9 after check. 11th call sees count=10.
    // Let me trace: checkRateLimit reads count. If count >= MAX, block. Else increment.
    // Call 1: count=0 (no entry), set count=1, return allowed
    // Call 2: count=1, check 1<10, increment to 2, allowed
    // ...
    // Call 10: count=9, check 9<10, increment to 10, allowed
    // Call 11: count=10, check 10>=10, BLOCKED
    for (let i = 9; i < 11; i++) {
      checkRateLimit(ip);
    }
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter!).toBeGreaterThan(0);
  });

  it('different IPs have separate counters', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('ip-a');
    }
    checkRateLimit('ip-a'); // one more to be blocked
    expect(checkRateLimit('ip-a').allowed).toBe(false);
    // IP 2 should still be allowed
    expect(checkRateLimit('ip-b').allowed).toBe(true);
  });

  it('recordFailedAttempt increments counter', () => {
    for (let i = 0; i < 10; i++) {
      recordFailedAttempt('ip-c');
    }
    expect(checkRateLimit('ip-c').allowed).toBe(false);
  });

  it('returns retryAfter in seconds', () => {
    const ip = '192.168.1.3';
    for (let i = 0; i < 11; i++) {
      checkRateLimit(ip);
    }
    const result = checkRateLimit(ip);
    expect(result.retryAfter!).toBeLessThanOrEqual(900);
    expect(result.retryAfter!).toBeGreaterThan(0);
  });
});
