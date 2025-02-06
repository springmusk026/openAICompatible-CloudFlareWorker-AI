import type { ChatCompletionRequest } from './types';
import type * as workers from '@cloudflare/workers-types';

/**
 * @function validateRequestBody
 * @description Validates the request body for chat completion requests.
 * 
 * @param {any} body - The request body to validate
 * @returns {workers.Response | null} Returns an error response if validation fails, otherwise null
 */
export function validateRequestBody(body: any): workers.Response | null {
  if (!body.model) {
    return createErrorResponse('model is required', 'invalid_request_error', 'model');
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return createErrorResponse(
      'messages array is required and cannot be empty',
      'invalid_request_error',
      'messages'
    );
  }

  for (const [index, message] of body.messages.entries()) {
    const originalContent = message.content;

    if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
      return createErrorResponse(
        `message at index ${index} has invalid role. Must be one of: system, user, assistant`,
        'invalid_request_error',
        'messages'
      );
    }

    if (
      !message.content
    ) {
      console.warn(`Invalid message detected at index ${index}:`, JSON.stringify(message, null, 2));
      return createErrorResponse(
        `message at index ${index} must have non-empty content string`,
        'invalid_request_error',
        'messages'
      );
    }

    if (message.content !== originalContent) {
      console.error(`Message content was modified during validation at index ${index}`);
    }
  }

  if (
    body.temperature !== undefined &&
    (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 2)
  ) {
    return createErrorResponse(
      'temperature must be a number between 0 and 2',
      'invalid_request_error',
      'temperature'
    );
  }

  if (
    body.max_tokens !== undefined &&
    (typeof body.max_tokens !== 'number' || body.max_tokens < 1)
  ) {
    return createErrorResponse(
      'max_tokens must be a positive number',
      'invalid_request_error',
      'max_tokens'
    );
  }

  if (body.stream !== undefined && typeof body.stream !== 'boolean') {
    return createErrorResponse(
      'stream must be a boolean value',
      'invalid_request_error',
      'stream'
    );
  }

  return null;
}

/**
 * @function createErrorResponse
 * @description Creates a standardized error response with JSON content type.
 * 
 * @param {string} message - The error message
 * @param {string} type - The error type
 * @param {string} [param] - Optional parameter that caused the error
 * @param {string} [code] - Optional error code
 * @param {number} [status=400] - HTTP status code (default 400)
 * @returns {workers.Response} The created error response
 */
export function createErrorResponse(
  message: string,
  type: string,
  param?: string,
  code?: string,
  status = 400
): workers.Response {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  return new Response(
    JSON.stringify({
      error: {
        message,
        type,
        ...(param && { param }),
        ...(code && { code }),
      },
    }),
    { status, headers }
  ) as workers.Response;
}

/**
 * @function calculateTokens
 * @description Estimates the number of tokens in a given text.
 * 
 * @param {string} text - The input text
 * @returns {number} Estimated number of tokens
 */
export function calculateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * @function safeJsonParse
 * @description Safely parses JSON strings without throwing errors.
 * 
 * @param {string} str - The JSON string to parse
 * @returns {any} Parsed object or null if parsing fails
 */
export function safeJsonParse(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
