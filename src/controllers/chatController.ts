import type * as workers from '@cloudflare/workers-types';
import { validateRequestBody, calculateTokens } from '../utils';
import { AIService } from '../services/aiService';
import { ChatCompletionRequest, ChatCompletionResponse, RateLimitInfo } from '../types';
import { addSecurityHeaders } from '../middleware/security';

/**
 * @class ChatController
 * @description Controller for handling chat completion requests.
 * Manages interaction between API requests and AI service.
 */
export class ChatController {
  /**
   * @constructor
   * @param {AIService} aiService - The AI service instance
   * Initializes the controller with necessary services.
   */
  constructor(private aiService: AIService) {}

  /**
   * @method createChatCompletion
   * @description Handles chat completion requests, both streaming and non-streaming.
   * 
   * @param {workers.Request} request - The incoming HTTP request object
   * @param {RateLimitInfo | null} rateLimitInfo - Rate limiting information
   * 
   * @returns {Promise<workers.Response>} The HTTP response containing chat completion result
   */
  async createChatCompletion(request: workers.Request, rateLimitInfo: RateLimitInfo | null): Promise<workers.Response> {
    try {
      const body: ChatCompletionRequest = await request.json();

      const validationError = validateRequestBody(body);
      if (validationError) {
        addSecurityHeaders(validationError.headers);
        return validationError;
      }

      if (body.stream) {
        const stream = await this.aiService.generateChatCompletion({
          messages: body.messages,
          model: body.model,
          temperature: body.temperature,
          max_tokens: body.max_tokens,
          stream: true
        });

        if (!(stream instanceof ReadableStream)) {
          throw new Error('Expected streaming response');
        }

        const headers = new Headers({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...(rateLimitInfo && {
            'X-RateLimit-Limit': rateLimitInfo.total.toString(),
            'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
            'X-RateLimit-Reset': rateLimitInfo.reset.toString()
          })
        });

        const reader = stream.getReader();
        const transformedStream = new ReadableStream({
            /**
             * @method start
             * @description Initializes the streaming process for chat completions.
             * 
             * @param {ReadableStreamDefaultController} controller - The stream controller
             * Sets up the streaming pipeline and chunk processing.
             */
            async start(controller) {
            let buffer = '';
            let sentRole = false;

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  if (buffer) {
                    await processChunk(buffer);
                  }

                  const doneEvent = {
                    id: `chatcmpl-${crypto.randomUUID()}`,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: body.model,
                    choices: [{
                      index: 0,
                      delta: {},
                      finish_reason: 'stop'
                    }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(doneEvent)}\n\n`));
                  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                  controller.close();
                  break;
                }

                const text = new TextDecoder().decode(value);
                buffer += text;

                while (buffer.includes('\n')) {
                  const newlineIndex = buffer.indexOf('\n');
                  const line = buffer.slice(0, newlineIndex);
                  buffer = buffer.slice(newlineIndex + 1);

                  if (line) {
                    await processChunk(line);
                  }
                }
              }
            } catch (error) {
              controller.error(error);
            }

            /**
             * @function processChunk
             * @description Processes individual chunks of streaming data.
             * 
             * @param {string} chunk - The incoming data chunk
             * Parses and formats the chunk for streaming response.
             */
            async function processChunk(chunk: string) {
              try {
                const jsonStr = chunk.startsWith('data: ') ? chunk.slice(6) : chunk;
                if (!jsonStr || jsonStr === '[DONE]') return;

                const data = JSON.parse(jsonStr);
                const timestamp = Math.floor(Date.now() / 1000);
                const chunkId = `chatcmpl-${crypto.randomUUID()}`;

                if (!sentRole) {
                  const roleChunk = {
                    id: chunkId,
                    object: 'chat.completion.chunk',
                    created: timestamp,
                    model: body.model,
                    choices: [{
                      index: 0,
                      delta: {
                        role: 'assistant'
                      },
                      finish_reason: null
                    }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(roleChunk)}\n\n`));
                  sentRole = true;
                }

                if (data.response) {
                  const contentChunk = {
                    id: chunkId,
                    object: 'chat.completion.chunk',
                    created: timestamp,
                    model: body.model,
                    choices: [{
                      index: 0,
                      delta: {
                        content: data.response
                      },
                      finish_reason: null
                    }]
                  };
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(contentChunk)}\n\n`));
                }
              } catch (e) {
                console.error('Error processing chunk:', e, '\nChunk:', chunk);
              }
            }
          }
        });

        const response = new Response(transformedStream, { headers }) as workers.Response;
        addSecurityHeaders(response.headers);
        return response;
      }

      const result = await this.aiService.generateChatCompletion({
        messages: body.messages,
        model: body.model,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        stream: false
      });

      if (result instanceof ReadableStream) {
        throw new Error('Unexpected streaming response');
      }

      const { content, finishReason } = result;
      const timestamp = Math.floor(Date.now() / 1000);
      const promptTokens = body.messages.reduce((acc, msg) => acc + calculateTokens(msg.content), 0);
      const completionTokens = calculateTokens(content);

      const completion: ChatCompletionResponse = {
        id: `chatcmpl-${crypto.randomUUID()}`,
        object: 'chat.completion',
        created: timestamp,
        model: body.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content
            },
            finish_reason: finishReason
          }
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens
        }
      };

      const headers = new Headers({
        'Content-Type': 'application/json',
        ...(rateLimitInfo && {
          'X-RateLimit-Limit': rateLimitInfo.total.toString(),
          'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
          'X-RateLimit-Reset': rateLimitInfo.reset.toString()
        })
      });

      const response = new Response(JSON.stringify(completion), { headers }) as workers.Response;
      addSecurityHeaders(response.headers);
      return response;

    } catch (error) {
      const response = new Response(JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'An error occurred',
          type: 'server_error'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }) as workers.Response;
      
      addSecurityHeaders(response.headers);
      return response;
    }
  }
}
