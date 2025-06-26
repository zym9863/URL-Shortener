# URL Shortener Service

High-performance URL shortener service based on Hono and Cloudflare Workers.

[中文文档 (Chinese)](./README.md)

## Features

- ✅ **URL Shortening**: Convert long URLs to short links
- ✅ **Custom Short Codes**: Support user-defined short codes
- ✅ **Expiration Time**: Set expiration time for short links
- ✅ **Access Statistics**: Record click count and last access time
- ✅ **Redirection**: Fast redirection to the original URL
- ✅ **Management**: Query statistics and delete short links
- ✅ **Web Interface**: Simple frontend UI
- ✅ **Security Validation**: URL format validation and security checks

## Tech Stack

- **Framework**: [Hono](https://hono.dev/) - Lightweight web framework
- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform
- **Storage**: [Cloudflare KV](https://developers.cloudflare.com/kv/) - Key-value storage
- **Language**: TypeScript

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cloudflare KV

Create KV namespaces in the Cloudflare Dashboard:

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Go to "Workers & Pages" > "KV"
4. Create two namespaces:
   - `url-shortener-production` (Production)
   - `url-shortener-preview` (Preview)

### 3. Update Configuration

Edit `wrangler.jsonc` and replace the KV namespace IDs with your actual IDs:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "URL_STORE",
      "preview_id": "your-preview-namespace-id",
      "id": "your-production-namespace-id"
    }
  ]
}
```

### 4. Local Development

```bash
npm run dev
```

Visit `http://localhost:8787` to view the app.

### 5. Deploy to Cloudflare Workers

```bash
npm run deploy
```

## API Documentation

### Create Short Link

**POST** `/api/shorten`

Request body:
```json
{
  "url": "https://example.com/very/long/url",
  "customCode": "mycode",  // Optional, custom short code
  "expiresInDays": 30       // Optional, expiration days (1-365)
}
```

Response:
```json
{
  "shortCode": "abc123",
  "originalUrl": "https://example.com/very/long/url",
  "shortUrl": "https://your-domain.com/abc123",
  "createdAt": "2025-06-26T10:00:00.000Z",
  "expiresAt": "2025-07-26T10:00:00.000Z"
}
```

### Redirect

**GET** `/:shortCode`

Visiting the short link will redirect to the original URL.

### Query Statistics

**GET** `/api/stats/:shortCode`

Response:
```json
{
  "shortCode": "abc123",
  "originalUrl": "https://example.com/very/long/url",
  "createdAt": "2025-06-26T10:00:00.000Z",
  "expiresAt": "2025-07-26T10:00:00.000Z",
  "clickCount": 42,
  "lastAccessed": "2025-06-26T15:30:00.000Z"
}
```

### Delete Short Link

**DELETE** `/api/:shortCode`

Response:
```json
{
  "message": "Short link deleted successfully"
}
```

## Security Features

- **URL Validation**: Only allow HTTP/HTTPS protocols
- **Domain Check**: Block local addresses and private IPs
- **Short Code Validation**: Prevent reserved words and pure numbers
- **Length Limit**: Max URL length 2048 characters
- **Input Sanitization**: Auto-clean and normalize input

## Limitations

- Short code length: 3-10 characters
- Max URL length: 2048 characters
- Max expiration: 365 days
- Reserved words: api, admin, www, app, stats, help, about

## Project Structure

```
src/
├── index.ts    # Main application file
├── utils.ts    # Utility functions
wrangler.jsonc  # Cloudflare Workers config
package.json    # Project dependencies
```

## Development Notes

### Add New Features

1. Add utility functions in `src/utils.ts`
2. Add API endpoints in `src/index.ts`
3. Update frontend UI (if needed)

### Custom Configuration

You can customize by editing the following files:

- `src/utils.ts`: Modify short code generation and validation logic
- `src/index.ts`: Modify API behavior and frontend UI
- `wrangler.jsonc`: Modify Cloudflare Workers config

## License

MIT License

## Contributing

Feel free to submit Issues and Pull Requests!
