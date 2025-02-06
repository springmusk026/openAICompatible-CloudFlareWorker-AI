import type * as workers from '@cloudflare/workers-types';
import { addSecurityHeaders } from '../middleware/security';
import { AIService } from '../services/aiService';

export class ModelsController {
  constructor(private aiService: AIService) {}

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
