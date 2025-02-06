import type { Response, Request, Env, RateLimitInfo } from '../types';
import { createApiResponse } from '../types';

const RATE_LIMIT = 100;
const WINDOW_SIZE = 60 * 60;

interface RateLimitData {
  count: number;
  timestamp: number;
}

export async function checkRateLimit(request: Request, env: Env): Promise<RateLimitInfo | Response> {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return createApiResponse({
        error: {
          message: 'Missing API key for rate limiting',
          type: 'rate_limit_error'
        }
      }, { status: 429 });
    }

    const now = Math.floor(Date.now() / 1000);
    const rateLimitKey = `ratelimit:${apiKey}`;

    const currentData = await env.RATE_LIMIT_KV.get(rateLimitKey);
    let data: RateLimitData;

    if (currentData) {
      data = JSON.parse(currentData);
      if (now - data.timestamp >= WINDOW_SIZE) {
        data = { count: 0, timestamp: now };
      }
    } else {
      data = { count: 0, timestamp: now };
    }

    if (data.count >= RATE_LIMIT) {
      const reset = data.timestamp + WINDOW_SIZE;
      return createApiResponse({
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error'
        }
      }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString()
        }
      });
    }

    data.count++;
    await env.RATE_LIMIT_KV.put(rateLimitKey, JSON.stringify(data), {
      expirationTtl: WINDOW_SIZE
    });

    return {
      remaining: RATE_LIMIT - data.count,
      reset: data.timestamp + WINDOW_SIZE,
      total: RATE_LIMIT
    };

  } catch (error) {
    console.error('Rate limit error:', error);
    return createApiResponse({
      error: {
        message: 'Error checking rate limit',
        type: 'server_error'
      }
    }, { status: 500 });
  }
}
