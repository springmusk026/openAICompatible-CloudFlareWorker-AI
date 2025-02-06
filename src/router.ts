import type { Request, Response, Env, RateLimitInfo } from './types';
import { ChatController } from './controllers/chatController';
import { ModelsController } from './controllers/modelsController';
import { AIService } from './services/aiService';
import { verifyApiKey } from './middleware/auth';
import { checkRateLimit } from './middleware/rateLimit';
import { addSecurityHeaders } from './middleware/security';
import { createApiResponse } from './types';

/**
 * @class Router
 * @description Main application router that handles routing logic and request delegation.
 * Responsible for directing incoming requests to appropriate controllers.
 */
export class Router {
  private chatController: ChatController;
  private modelsController: ModelsController;

  /**
   * @constructor
   * @param {Env} env - The environment configuration
   * Initializes necessary services and controllers.
   */
  constructor(env: Env) {
    const aiService = new AIService(env.AI);
    this.chatController = new ChatController(aiService);
    this.modelsController = new ModelsController(aiService);
  }

  /**
   * @method handle
   * @description Main request handler that processes incoming HTTP requests.
   * 
   * @param {Request} request - The incoming HTTP request object
   * @param {Env} env - The environment configuration
   * 
   * @returns {Promise<Response>} The HTTP response
   * Handles routing, authentication, rate limiting, and delegates to appropriate controllers.
   */
  async handle(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return this.handlePreflight();
    }

    try {
      const apiKeyError = await verifyApiKey(request, env);
      if (apiKeyError) {
        addSecurityHeaders(apiKeyError.headers);
        return apiKeyError;
      }

      const rateLimitResult = await checkRateLimit(request, env);
      if (rateLimitResult instanceof Response) {
        addSecurityHeaders(rateLimitResult.headers);
        return rateLimitResult;
      }

      const rateLimitInfo = rateLimitResult as RateLimitInfo;

      const url = new URL(request.url);
      const path = url.pathname;

      switch (true) {
        case path === '/v1/chat/completions' && request.method === 'POST':
          return this.chatController.createChatCompletion(request, rateLimitInfo);

        case path === '/v1/models' && request.method === 'GET':
          return this.modelsController.listModels();

        default:
          return createApiResponse({
            error: {
              message: 'Not Found',
              type: 'invalid_request_error'
            }
          }, { status: 404 });
      }
    } catch (error) {
      console.error('Router error:', error);
      return createApiResponse({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      }, { status: 500 });
    }
  }

  /**
   * @method handlePreflight
   * @private
   * @description Handles CORS preflight requests.
   * 
   * @returns {Response} The HTTP response for OPTIONS requests
   */
  private handlePreflight(): Response {
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    });

    addSecurityHeaders(headers);
    return new Response(null, { headers });
  }
}
