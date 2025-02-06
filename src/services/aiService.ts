import { AIModel, StreamingChatResponse } from '../types';
import modelsData from '../models.json';

/**
 * @class AIService
 * @description Service for interacting with AI models and capabilities.
 */
export class AIService {
  /**
   * @constructor
   * @param {any} ai - The AI instance from the environment
   * Initializes the service with necessary dependencies.
   */
  constructor(private ai: any) { }

  /**
   * @method listAvailableModels
   * @description Retrieves the list of available AI models.
   * 
   * @returns {Promise<AIModel[]>} Array of available AI models
   */
  async listAvailableModels(): Promise<AIModel[]> {
    try {
      return modelsData.models;
    } catch (error) {
      console.error('Error listing models:', error);
      throw new Error('Failed to list available models');
    }
  }

  /**
   * @method generateChatCompletion
   * @description Generates chat completions using the specified AI model.
   * 
   * @param {Object} params - Parameters for generating chat completion
   * @param {Array} params.messages - The conversation messages
   * @param {string} params.model - The AI model to use
   * @param {number} [params.temperature] - Sampling temperature
   * @param {number} [params.max_tokens] - Maximum number of tokens to generate
   * @param {boolean} [params.stream] - Whether to stream the response
   * 
   * @returns {Promise<{ content: string; finishReason: string } | ReadableStream>} Chat completion result or stream
   */
  async generateChatCompletion(params: {
    messages: { role: string; content: string }[];
    model: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }): Promise<{ content: string; finishReason: string } | ReadableStream> {
    try {
      const models = await this.listAvailableModels();
      const modelInfo = models.find(m => m.id === params.model);

      if (!modelInfo) {
        throw new Error(`Model ${params.model} not found`);
      }

      if (!modelInfo.capabilities?.chat) {
        throw new Error(`Model ${params.model} does not support chat completions`);
      }

      const validMessages = params.messages.filter(msg => {
        const isValid = msg.content && msg.content !== '';
        if (!isValid) {
          console.warn(`Removing invalid message:`, JSON.stringify(msg, null, 2));
        }
        return isValid;
      });

      if (validMessages.length === 0) {
        throw new Error('No valid messages with content found');
      }
      params = { ...params, messages: validMessages };

      if (params.stream) {
        const aiInstance = this.ai;
        return new ReadableStream({
            /**
             * @method start
             * @description Initializes the streaming process for chat completions.
             * 
             * @param {ReadableStreamDefaultController} controller - The stream controller
             * Sets up the streaming pipeline from AI service to client.
             */
            async start(controller) {
            try {
              const response = await aiInstance.run(params.model, {
                messages: params.messages,
                stream: true,
                max_tokens: params.max_tokens || 256,
                temperature: params.temperature || 0.7
              });

              if (response instanceof ReadableStream) {
                const reader = response.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
              } else {
                throw new Error('Expected streaming response from AI service');
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });
      } else {
        const response = await this.ai.run(params.model, {
          messages: params.messages,
          stream: false,
          max_tokens: params.max_tokens || 256,
          temperature: params.temperature || 0.7
        });

        if (!response || !response.response) {
          throw new Error('Invalid response from AI service');
        }

        return {
          content: response.response,
          finishReason: 'stop'
        };
      }
    } catch (error) {
      console.error('Error generating chat completion:', error);
      throw error instanceof Error ? error : new Error('AI service error');
    }
  }

  /**
   * @method getModelById
   * @description Retrieves an AI model by its ID.
   * 
   * @param {string} modelId - The ID of the model to retrieve
   * @returns {AIModel | undefined} The matching AI model or undefined if not found
   */
  getModelById(modelId: string): AIModel | undefined {
    return modelsData.models.find(model => model.id === modelId);
  }
}
