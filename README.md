# Cloudflare OpenAI-Compatible API Worker

A Cloudflare Worker that provides an OpenAI-compatible API interface for Cloudflare's AI models. This worker allows you to use Cloudflare's AI capabilities through endpoints that match OpenAI's API format.

## Features

- OpenAI-compatible API endpoints
- Support for multiple AI models
- Rate limiting
- API key authentication
- Security headers
- CORS support
- Comprehensive error handling
- TypeScript support

## Endpoints

### List Models
```
GET /v1/models
```
Returns a list of available AI models.

### Chat Completions
```
POST /v1/chat/completions
```
Create a chat completion with the specified model.

## Setup

1. Create KV namespaces for API keys and rate limiting:
```bash
wrangler kv:namespace create "API_KEYS"
wrangler kv:namespace create "RATE_LIMIT_KV"
```

2. Update `wrangler.json` with your KV namespace IDs:
```json
{
  "kv_namespaces": [
    {
      "binding": "API_KEYS",
      "id": "YOUR_API_KEYS_KV_ID"
    },
    {
      "binding": "RATE_LIMIT_KV",
      "id": "YOUR_RATE_LIMIT_KV_ID"
    }
  ]
}
```

3. Deploy the worker:
```bash
wrangler deploy
```

## Configuration

### Environment Variables
- `ENVIRONMENT`: Set to "development", "staging", or "production"

### API Keys
Store API keys in the API_KEYS KV namespace:
```bash
wrangler kv:key put --binding=API_KEYS "your-api-key" "{}"
```

## Security Features

- API key authentication
- Rate limiting (100 requests per hour by default)
- Strict security headers
- Input validation
- Error handling
- CORS configuration

## Development

1. Install dependencies:
```bash
npm install
```

2. Run locally:
```bash
wrangler dev
```

3. Test:
```bash
npm test
```

## Making Requests

Example chat completion request:
```bash
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "@cf/meta/llama-3.1-70b-instruct",
    "messages": [
        {
            "role": "user",
            "content": "hi send a joke"
        }
    ],
    "stream": true
}'
```

## Rate Limiting

The default rate limit is 100 requests per hour per API key. This can be configured in `src/middleware/rateLimit.ts`.

## Error Handling

The API returns standard error responses in this format:
```json
{
  "error": {
    "message": "Error message here",
    "type": "error_type",
    "param": "optional_param",
    "code": "optional_code"
  }
}
```

## License

MIT License
