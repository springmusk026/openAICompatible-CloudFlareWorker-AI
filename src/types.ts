import type * as workers from '@cloudflare/workers-types';

export type Request = workers.Request;
export type Response = workers.Response;
export type Headers = workers.Headers;
export type ExecutionContext = workers.ExecutionContext;
export type KVNamespace = workers.KVNamespace;

export interface ChatCompletionRequest {
  model: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export interface Env {
  AI: any;
  API_KEYS: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
}

export interface RateLimitInfo {
  remaining: number;
  reset: number;
  total: number;
}

export interface AIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  capabilities?: {
    embeddings?: boolean;
    chat?: boolean;
    completions?: boolean;
    translation?: boolean;
  };
  source?: number;
  name?: string;
  description?: string;
  task?: {
    id: string;
    name: string;
    description: string;
  };
  properties?: Array<{
    property_id: string;
    value: string;
  }>;
  finetunes?: Array<{
    id: string;
    name: string;
    description: string;
    created_at: string;
    modified_at: string;
    public: number;
    model: string;
  }>;
}

/**
 * @function isError
 * @description Type guard to check if an object is an instance of Error.
 * 
 * @param {unknown} error - The object to check
 * @returns {error is Error} Returns true if the object is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * @function createApiResponse
 * @description Creates a standardized API response with JSON content type.
 * 
 * @param {unknown} body - The response body content
 * @param {ResponseInit} init - Optional response initialization options
 * @returns {workers.Response} The created API response
 */
export function createApiResponse(body: unknown, init: ResponseInit = {}): workers.Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  
  return new Response(JSON.stringify(body), {
    ...init,
    headers
  }) as workers.Response;
}

export interface StreamingChatResponse {
  id: string;
  created: number;
  model: string;
  content: string;
  done: boolean;
  finishReason?: string;
}
