import type { Response, Request, Env } from '../types';
import { createApiResponse } from '../types';

/**
 * @function verifyApiKey
 * @description Verifies the API key in the request's Authorization header.
 * 
 * @param {Request} request - The incoming HTTP request object
 * @param {Env} env - The environment configuration
 * 
 * @returns {Promise<Response | null>} Returns an error response if verification fails, otherwise null
 */
export async function verifyApiKey(request: Request, env: Env): Promise<Response | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return createApiResponse({
      error: {
        message: 'No API key provided. Include as Bearer token in Authorization header',
        type: 'authentication_error'
      }
    }, { status: 401 });
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return createApiResponse({
      error: {
        message: 'Invalid Authorization header format. Use "Bearer YOUR-API-KEY"',
        type: 'authentication_error'
      }
    }, { status: 401 });
  }

  const apiKey = match[1];

  try {
    const keyInfo = await env.API_KEYS.get("apikey", 'json');

    /*console.log(keyInfo)
    if (!keyInfo) {
      return createApiResponse({
        error: {
          message: 'Invalid API key provided',
          type: 'authentication_error'
        }
      }, { status: 401 });
    }*/

    return null;

  } catch (error) {
    console.error('Error verifying API key:', error);
    return createApiResponse({
      error: {
        message: 'Error verifying API key',
        type: 'server_error'
      }
    }, { status: 500 });
  }
}
