import type * as workers from '@cloudflare/workers-types';
import { addSecurityHeaders } from '../middleware/security';
import { AIService } from '../services/aiService';

/**
 * @class ModelsController
 * @description Controller for handling model listing requests.
 * Manages interaction between API requests and AI service for model information.
 */
export class ModelsController {
  /**
   * @constructor
   * @param {AIService} aiService - The AI service instance
   * Initializes the controller with necessary services.
   */
  constructor(private aiService: AIService) {}

  /**
   * @method listModels
   * @description Handles requests to list available AI models.
   * 
   * @returns {Promise<workers.Response>} The HTTP response containing available models
   */
  async listModels(): Promise<workers.Response> {
    try {
      const models = await this.aiService.listAvailableModels();
      
      const response = new Response(JSON.stringify({
        object: 'list',
        data: models
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      addSecurityHeaders(response.headers);
      return response;
      
    } catch (error) {
      const response = new Response(JSON.stringify({
        error: {
          message: 'Failed to list models',
          type: 'server_error'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      
      addSecurityHeaders(response.headers);
      return response;
    }
  }
}
