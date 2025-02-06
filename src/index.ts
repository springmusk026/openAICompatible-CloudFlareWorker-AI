import { Router } from './router';
import type { Env, Request, Response, ExecutionContext } from './types';
import { addSecurityHeaders } from './middleware/security';
import { isError } from './types';

/**
 * @description Handles incoming HTTP requests for the application.
 * This is the main entry point for processing requests.
 * 
 * @param {Request} request - The incoming HTTP request object
 * @param {Env} env - The environment configuration
 * @param {ExecutionContext} ctx - The execution context
 * 
 * @returns {Promise<Response>} The HTTP response
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const router = new Router(env);
      const response = await router.handle(request, env);
      
      addSecurityHeaders(response.headers);
      return response;
    } catch (error) {
      console.error('Unhandled error:', error);
      
      const errorResponse = new Response(JSON.stringify({
        error: {
          message: isError(error) ? error.message : 'An unexpected error occurred',
          type: 'internal_error'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });

      addSecurityHeaders(errorResponse.headers);
      return errorResponse;
    }
  },
} satisfies ExportedHandler<Env>;
