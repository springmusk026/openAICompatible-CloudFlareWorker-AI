# Cloudflare OpenAI-Compatible API Worker ![Build Status](https://img.shields.io/badge/build-passing-brightgreen)

Cloudflare OpenAI-Compatible API Worker is a robust implementation of OpenAI's API specification using Cloudflare Workers. This project enables developers to leverage Cloudflare's AI capabilities through familiar OpenAI-compatible endpoints, providing seamless integration with existing AI workflows.

## Overview

This Cloudflare Worker implementation offers:
- Full compatibility with OpenAI's API specifications
- Support for multiple AI models and capabilities
- Enterprise-grade security features
- Comprehensive rate limiting and authentication
- Production-ready architecture

The API supports both streaming and non-streaming responses, making it suitable for various applications including chatbots, content generation, and AI-powered services.

## Key Features

### Core Functionality
- **OpenAI-Compatible Endpoints**: Fully compliant with OpenAI's API specification
- **Model Support**: Multiple AI models with capability detection
- **Streaming Support**: Real-time response streaming for chat completions

### Security
- **API Key Authentication**: Secure access control
- **Rate Limiting**: Configurable request limits per API key
- **Security Headers**: Industry-standard protection mechanisms
- **Input Validation**: Robust request validation and sanitization

### Development
- **TypeScript Implementation**: Strongly-typed codebase for reliability
- **Comprehensive Error Handling**: Clear and consistent error responses
- **CORS Configuration**: Flexible cross-origin resource sharing

### Deployment
- **Cloudflare Workers**: Serverless deployment with global edge caching
- **KV Storage Integration**: For API keys and rate limiting data

## API Documentation

### 1. List Models
**Endpoint**: `GET /v1/models`

**Description**: Returns a list of available AI models with their capabilities.

**Response**:
```json
{
  "object": "list",
  "data": [
    {
      "id": "model-id",
      "object": "model",
      "created": 1686934500,
      "owned_by": "cloudflare",
      "capabilities": {
        "chat": true,
        "completions": true
      }
    }
  ]
}
```

### 2. Create Chat Completion
**Endpoint**: `POST /v1/chat/completions`

**Request Body**:
```json
{
  "model": "model-id",
  "messages": [
    {
      "role": "user",
      "content": "Your message here"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": false
}
```

**Response**:
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1686934500,
  "model": "model-id",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Response message"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

## Installation and Setup

### Prerequisites
- Node.js (v18+)
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### Step 1: Set Up KV Namespaces
```bash
# Create KV namespaces
wrangler kv:namespace create "API_KEYS"
wrangler kv:namespace create "RATE_LIMIT_KV"

# Update wrangler.json with your KV namespace IDs:
```json
{
  "kv_namespaces": [
    {
      "binding": "API_KEYS",
      "id": "YOUR_API_KEYS_NAMESPACE_ID"
    },
    {
      "binding": "RATE_LIMIT_KV",
      "id": "YOUR_RATE_LIMIT_NAMESPACE_ID"
    }
  ]
}
```
```

### Step 2: Configure Environment Variables
Set the following environment variables in your Cloudflare dashboard:
- `ENVIRONMENT`: "development" | "staging" | "production"

### Step 3: Add API Keys
```bash
wrangler kv:key put --binding=API_KEYS "your-api-key" '{"permissions":"read-write"}'
```

### Step 4: Deploy
```bash
# Install dependencies
npm install

# Deploy to Cloudflare
npm run deploy
```

## Configuration Options

### Environment Variables
| Variable | Description | Values |
|----------|-------------|--------|
| ENVIRONMENT | Deployment environment | "development", "staging", "production" |

### API Key Management
Use the following commands to manage API keys:
```bash
# Add new API key
wrangler kv:key put --binding=API_KEYS "key-name" '{"permissions":"read-write"}'

# Get API key
wrangler kv:key get --binding=API_KEYS "key-name"

# Delete API key
wrangler kv:key delete --binding=API_KEYS "key-name"
```

## Security Implementation

### Authentication
- **Bearer Token**: All requests must include `Authorization: Bearer YOUR_API_KEY`

### Rate Limiting
- Default: 100 requests/hour per API key
- Configurable in `src/middleware/rateLimit.ts`

### Security Headers
Automatically applied to all responses:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Content-Security-Policy`
- `Permissions-Policy`

### CORS Configuration
Configured in `src/router.ts`:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
```

## Development Workflow

### Local Development
```bash
# Start local development server
npm run dev

# Watch mode
npm run watch
```

### Testing
```bash
# Run unit tests
npm test

# Test coverage
npm run coverage
```

### Linting and Formatting
```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Build
```bash
# Compile TypeScript
npm run build
```

## Usage Examples

### Chat Completion
```bash
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "model-id",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain quantum computing in simple terms"}
    ],
    "temperature": 0.7,
    "max_tokens": 150,
    "stream": false
  }'
```

### Streaming Response
```bash
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "model-id",
    "messages": [
      {"role": "user", "content": "Tell me a story"}
    ],
    "stream": true
  }'
```


## Error Responses

All errors follow this standardized format:
```json
{
  "error": {
    "message": "Descriptive error message",
    "type": "error_category",
    "param": "affected_parameter",
    "code": "error_code"
  }
}
```

### Common Error Types

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | validation_error | Invalid request parameters |
| 401 | authentication_error | Missing or invalid API key |
| 403 | permission_error | Insufficient permissions |
| 404 | not_found | Resource not found |
| 429 | rate_limit_error | Rate limit exceeded |
| 500 | server_error | Internal server error |

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Branching**: Create a new branch for your feature/fix
2. **Commit Messages**: Use conventional commit messages
3. **Testing**: Ensure all tests pass before submitting PR
4. **Code Style**: Follow project's formatting rules
5. **Documentation**: Update relevant documentation

```bash
# Development workflow
git checkout -b feature/your-feature
npm run format
npm test
git commit -m "feat: your feature description"
```

## License

This project is licensed under the MIT License:

```
MIT License

Copyright (c) [year] [fullname]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Wrangler CLI Guide](https://developers.cloudflare.com/workers/wrangler/)

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
