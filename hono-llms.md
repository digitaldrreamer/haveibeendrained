# Hono

> Hono is a small, simple, and ultrafast web framework built on Web Standards. It works on any JavaScript runtime: Cloudflare Workers, Fastly Compute, Deno, Bun, Vercel, Netlify, AWS Lambda, Lambda@Edge, and Node.js.

Hono (means "flame" 🔥 in Japanese) is a TypeScript-first web framework designed for maximum portability and performance. The router RegExpRouter is extremely fast, and the hono/tiny preset is under 14kB. Using only Web Standard APIs (Request, Response, and Fetch), Hono code runs anywhere without modifications.

## Key Features

- **Ultrafast & Lightweight**: RegExpRouter with one-time regex matching, under 14kB for hono/tiny preset
- **Multi-runtime Support**: Same code works on Cloudflare Workers, Deno, Bun, AWS Lambda, Node.js, Vercel, Fastly Compute, and more
- **Web Standards Based**: Built entirely on standard Web APIs (Request/Response/Fetch) for maximum portability
- **TypeScript First**: Full TypeScript support with excellent type inference and DX
- **Batteries Included**: Built-in middleware, helpers, and rich third-party ecosystem
- **RPC Mode**: Share API types between server and client with type-safe client generation
- **Zero Dependencies**: Core package has no external dependencies

## Core Concepts

### Basic Application

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hono!'))
app.post('/posts', (c) => c.json({ message: 'Created' }, 201))

export default app
```

### Context Object (c)

The Context object is the heart of Hono, instantiated per request and used throughout middleware and handlers:

- **Request access**: `c.req.header()`, `c.req.query()`, `c.req.param()`, `c.req.json()`, `c.req.valid()`
- **Response helpers**: `c.text()`, `c.json()`, `c.html()`, `c.redirect()`, `c.notFound()`
- **State management**: `c.set()`, `c.get()`, `c.var` for passing data between middleware
- **Environment**: `c.env` for accessing platform-specific bindings (Workers KV, R2, etc.)
- **Rendering**: `c.render()`, `c.setRenderer()` for JSX/template rendering

### Routing

Hono supports flexible routing patterns:

```typescript
// Basic routes
app.get('/posts', handler)
app.post('/posts', handler)
app.put('/posts/:id', handler)
app.delete('/posts/:id', handler)

// Multiple methods
app.on(['GET', 'POST'], '/posts', handler)
app.all('/all', handler)

// Path parameters with regex
app.get('/users/:id{[0-9]+}', handler)

// Optional parameters
app.get('/api/posts/:format?', handler)

// Wildcards
app.get('/files/*', handler)

// Grouping routes
const api = new Hono().basePath('/api')
api.get('/users', handler)
app.route('/', api) // Mounts at /api/users
```

### Middleware

Middleware executes before/after handlers in an onion model:

```typescript
// Global middleware
app.use('*', logger())

// Path-specific middleware
app.use('/api/*', bearerAuth({ token: 'secret' }))

// Custom middleware
app.use(async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
  c.header('X-Custom', 'Added after handler')
})

// Using createMiddleware for type safety
import { createMiddleware } from 'hono/factory'

const authMiddleware = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', { id: '123', name: 'John' })
  await next()
})
```

## Built-in Middleware

- **Basic Auth**: `basicAuth()` - HTTP Basic authentication
- **Bearer Auth**: `bearerAuth()` - Bearer token authentication
- **JWT Auth**: `jwt()` - JWT verification and validation
- **CORS**: `cors()` - Cross-origin resource sharing
- **Logger**: `logger()` - Request/response logging
- **Pretty JSON**: `prettyJSON()` - Formatted JSON responses
- **Secure Headers**: `secureHeaders()` - Security headers
- **ETag**: `etag()` - ETag generation
- **Compress**: `compress()` - Response compression
- **Cache**: `cache()` - Response caching
- **Timing**: `timing()` - Server-Timing header
- **Powered By**: `poweredBy()` - X-Powered-By header

## Validation

### With Zod

```typescript
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const schema = z.object({
  name: z.string().min(3),
  age: z.number().min(0)
})

app.post('/users', 
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: result.error }, 400)
    }
  }),
  (c) => {
    const data = c.req.valid('json') // Fully typed
    return c.json({ message: 'Created', data })
  }
)
```

### Validation Targets

- `json` - Request body as JSON
- `form` - Form data
- `query` - Query parameters
- `param` - Path parameters
- `header` - Headers
- `cookie` - Cookies

### Other Validators

Hono supports multiple validation libraries via Standard Schema or dedicated middleware:
- Zod Validator (`@hono/zod-validator`)
- Valibot Validator
- ArkType Validator
- TypeBox Validator
- Typia Validator

## RPC (Remote Procedure Call)

Hono's RPC feature enables full type-safe APIs between server and client:

### Server

```typescript
// server.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()
  .get('/posts/:id',
    zValidator('param', z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid('param')
      return c.json({ id, title: 'Hello' })
    }
  )
  .post('/posts',
    zValidator('json', z.object({ title: z.string() })),
    async (c) => {
      const data = c.req.valid('json')
      return c.json({ id: '1', ...data }, 201)
    }
  )

export type AppType = typeof app
export default app
```

### Client

```typescript
// client.ts
import { hc } from 'hono/client'
import type { AppType } from './server'

const client = hc<AppType>('http://localhost:8787')

// Fully typed!
const res = await client.posts[':id'].$get({ param: { id: '123' } })
const data = await res.json() // { id: string, title: string }

// POST request
const postRes = await client.posts.$post({
  json: { title: 'New Post' }
})
```

RPC provides:
- Full TypeScript type inference for paths, methods, params, and responses
- Autocomplete in IDE
- Type errors at compile time
- Works with React Query, SWR, and other data fetching libraries

## JSX Rendering

Hono has built-in JSX support for server-side rendering:

```typescript
import { Hono } from 'hono'
import type { FC } from 'hono/jsx'

const Layout: FC = (props) => {
  return (
    <html>
      <body>
        <h1>My App</h1>
        {props.children}
      </body>
    </html>
  )
}

const Page: FC<{ title: string }> = (props) => {
  return (
    <Layout>
      <h2>{props.title}</h2>
    </Layout>
  )
}

app.get('/page', (c) => {
  return c.html(<Page title="Hello Hono" />)
})
```

JSX features:
- Server-side JSX rendering with `c.html()`
- Fragments, Context API, and Hooks
- Streaming with `renderToReadableStream()`
- Suspense support
- JSX Renderer Middleware for layouts
- `useRequestContext()` to access Context in components

## Helpers

Hono provides utility helpers for common tasks:

### Cookie Helper

```typescript
import { getCookie, setCookie, deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'

app.get('/cookie', (c) => {
  const value = getCookie(c, 'my_cookie')
  setCookie(c, 'new_cookie', 'value', {
    path: '/',
    secure: true,
    httpOnly: true,
    maxAge: 1000,
    sameSite: 'Strict'
  })
  deleteCookie(c, 'old_cookie')
})

// Signed cookies (returns Promise)
app.get('/signed', async (c) => {
  const value = await getSignedCookie(c, 'secret', 'signed_cookie')
  await setSignedCookie(c, 'new_signed', 'value', 'secret')
})
```

### Streaming Helper

```typescript
import { stream, streamText, streamSSE } from 'hono/streaming'

// Basic streaming
app.get('/stream', (c) => {
  return stream(c, async (stream) => {
    await stream.write(new TextEncoder().encode('Hello'))
    await stream.sleep(1000)
    await stream.write(new TextEncoder().encode('World'))
  })
})

// Text streaming
app.get('/text', (c) => {
  return streamText(c, async (stream) => {
    await stream.writeln('Line 1')
    await stream.sleep(1000)
    await stream.writeln('Line 2')
  })
})

// Server-Sent Events
app.get('/sse', (c) => {
  return streamSSE(c, async (stream) => {
    for (let i = 0; i < 10; i++) {
      await stream.writeSSE({ data: `Message ${i}`, event: 'time' })
      await stream.sleep(1000)
    }
  })
})
```

### Other Helpers

- **html**: HTML helper for safe string interpolation
- **CSS**: CSS helper for styling
- **Connect Adapter**: Connect/Express compatibility
- **Dev Server**: Development server helper
- **Factory**: Create middleware and handlers with types
- **JWT**: JWT sign and verify
- **SSG**: Static site generation
- **Testing**: Test client for E2E testing
- **WebSocket**: WebSocket upgrade helpers (platform-specific)

## Zod OpenAPI

The `@hono/zod-openapi` middleware enables OpenAPI spec generation with Zod validation:

```typescript
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'

const ParamsSchema = z.object({
  id: z.string().openapi({ example: '123' })
})

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number()
}).openapi('User')

const route = createRoute({
  method: 'get',
  path: '/users/{id}',
  request: {
    params: ParamsSchema
  },
  responses: {
    200: {
      content: {
        'application/json': { schema: UserSchema }
      },
      description: 'Get user by ID'
    }
  }
})

const app = new OpenAPIHono()

app.openapi(route, (c) => {
  const { id } = c.req.valid('param')
  return c.json({ id, name: 'John', age: 30 })
})

// Generate OpenAPI spec
app.doc('/doc', {
  openapi: '3.0.0',
  info: { version: '1.0.0', title: 'My API' }
})

// Swagger UI
app.get('/ui', swaggerUI({ url: '/doc' }))
```

Features:
- Automatic OpenAPI 3.0/3.1 spec generation
- Type-safe request/response with Zod schemas
- Works with Hono RPC mode
- Built-in Swagger UI support
- Security schemes (Bearer, Basic, API Key, OAuth2)

## Serving Static Files

### Node.js

```typescript
import { serveStatic } from '@hono/node-server/serve-static'

app.use('/static/*', serveStatic({ root: './' }))
app.use('/favicon.ico', serveStatic({ path: './favicon.ico' }))
```

### Cloudflare Workers

```typescript
import { serveStatic } from 'hono/cloudflare-workers'

app.use('/static/*', serveStatic({ root: './' }))
```

### Deno

```typescript
import { serveStatic } from 'hono/deno'

app.use('/static/*', serveStatic({ root: './' }))
```

### Bun

```typescript
import { serveStatic } from 'hono/bun'

app.use('/static/*', serveStatic({ root: './' }))
```

## Error Handling

### HTTPException

```typescript
import { HTTPException } from 'hono/http-exception'

app.get('/error', (c) => {
  throw new HTTPException(401, { message: 'Unauthorized' })
})

// Custom response
const errorResponse = new Response('Custom error', {
  status: 401,
  headers: { 'WWW-Authenticate': 'Bearer' }
})
throw new HTTPException(401, { res: errorResponse })
```

### Error Handler

```typescript
app.onError((err, c) => {
  console.error(err)
  
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  
  return c.json({ error: 'Internal Server Error' }, 500)
})

// Custom error middleware
app.use('*', async (c, next) => {
  try {
    await next()
  } catch (error) {
    return c.json({ error: error.message }, 400)
  }
})
```

## Testing

Hono provides testing utilities for E2E testing:

```typescript
import { Hono } from 'hono'
import { testClient } from 'hono/testing'
import { describe, it, expect } from 'vitest'

const app = new Hono()
  .get('/search', (c) => {
    const q = c.req.query('q')
    return c.json({ query: q, results: [] })
  })
  .post('/posts', async (c) => {
    const body = await c.req.json()
    return c.json({ message: 'Created', data: body }, 201)
  })

describe('API Tests', () => {
  const client = testClient(app)
  
  it('should return search results', async () => {
    const res = await client.search.$get({ query: { q: 'hono' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.query).toBe('hono')
  })
  
  it('should create post', async () => {
    const res = await client.posts.$post({
      json: { title: 'Test' }
    })
    expect(res.status).toBe(201)
  })
})

// Alternative: Using app.request
test('GET /posts', async () => {
  const res = await app.request('/posts')
  expect(res.status).toBe(200)
})

test('POST /posts', async () => {
  const res = await app.request('/posts', {
    method: 'POST',
    body: JSON.stringify({ title: 'Hello' }),
    headers: { 'Content-Type': 'application/json' }
  })
  expect(res.status).toBe(201)
})
```

## Runtime-Specific Features

### Cloudflare Workers

```typescript
type Bindings = {
  MY_KV: KVNamespace
  MY_BUCKET: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/data', async (c) => {
  const value = await c.env.MY_KV.get('key')
  return c.text(value)
})

// Module Worker mode
export default {
  fetch: app.fetch,
  scheduled: async (batch, env) => {
    // Cron handler
  }
}
```

### Node.js

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server running on port ${info.port}`)
})
```

### Deno

```typescript
import { Hono } from 'jsr:@hono/hono'

const app = new Hono()

Deno.serve(app.fetch)
```

### Bun

```typescript
import { Hono } from 'hono'

const app = new Hono()

export default {
  port: 3000,
  fetch: app.fetch
}

// Or with Bun.serve
Bun.serve({
  fetch: app.fetch,
  port: 3000
})
```

## Third-Party Middleware

Popular third-party middleware packages include:

**Authentication**:
- `@hono/auth-js` - Auth.js integration
- `@hono/clerk-auth` - Clerk authentication
- `@hono/firebase-auth` - Firebase Auth
- `@hono/oidc-auth` - OpenID Connect

**Validators**:
- `@hono/zod-validator` - Zod validation
- `@hono/valibot-validator` - Valibot validation
- `@hono/arktype-validator` - ArkType validation
- `@hono/typebox-validator` - TypeBox validation

**Other**:
- `@hono/graphql-server` - GraphQL server
- `@hono/trpc-server` - tRPC server adapter
- `@hono/swagger-ui` - Swagger UI
- `@hono/sentry` - Sentry error tracking
- `@hono/node-ws` - WebSocket for Node.js
- `@hono/oauth-providers` - OAuth providers
- `@hono/prometheus` - Prometheus metrics

## Project Structure Best Practices

```
project/
├── src/
│   ├── index.ts          # Entry point
│   ├── routes/           # Route handlers
│   │   ├── users.ts
│   │   └── posts.ts
│   ├── middleware/       # Custom middleware
│   │   └── auth.ts
│   ├── schemas/          # Zod schemas
│   │   └── user.ts
│   ├── types/            # TypeScript types
│   │   └── env.ts
│   └── lib/              # Utilities
│       └── db.ts
├── test/                 # Tests
├── package.json
└── tsconfig.json
```

## Deployment

Hono apps can be deployed to:
- **Cloudflare Workers**: `wrangler deploy`
- **Deno Deploy**: Deploy via GitHub integration or `deployctl`
- **Vercel**: Works with Node.js or Edge runtime
- **Netlify**: Netlify Functions or Edge Functions
- **AWS Lambda**: Via Node.js or Lambda@Edge
- **Fly.io**: Docker container with Node.js/Bun/Deno
- **Railway**: Node.js/Bun/Deno support
- **Render**: Node.js/Deno support

## Resources

- [Official Documentation](https://hono.dev)
- [GitHub Repository](https://github.com/honojs/hono)
- [API Reference](https://hono.dev/docs/api)
- [Examples Repository](https://github.com/honojs/examples)
- [Third-Party Middleware](https://github.com/honojs/middleware)
- [Discord Community](https://discord.gg/KMh2eNSdxV)
- [npm Package](https://www.npmjs.com/package/hono)
- [JSR Registry](https://jsr.io/@hono/hono)

## Documentation

- [Getting Started](https://hono.dev/docs/getting-started/basic): Installation and basic usage
- [Routing](https://hono.dev/docs/api/routing): Route patterns and grouping
- [Context](https://hono.dev/docs/api/context): Context object methods and usage
- [Middleware](https://hono.dev/docs/api/middleware): Middleware concepts and built-in middleware
- [Helpers](https://hono.dev/docs/helpers): Utility helpers (Cookie, JWT, Streaming, etc.)
- [Validation](https://hono.dev/docs/guides/validation): Input validation with Zod and others
- [RPC](https://hono.dev/docs/guides/rpc): Type-safe RPC client setup
- [JSX](https://hono.dev/docs/guides/jsx): Server-side JSX rendering
- [Testing](https://hono.dev/docs/guides/testing): Testing strategies and helpers
- [Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers): Cloudflare-specific features
- [Node.js](https://hono.dev/docs/getting-started/nodejs): Node.js deployment
- [Deno](https://hono.dev/docs/getting-started/deno): Deno deployment
- [Bun](https://hono.dev/docs/getting-started/bun): Bun deployment

## Guides

- [Building a REST API](https://hono.dev/docs/guides/rest-api): Complete REST API tutorial
- [Authentication](https://hono.dev/docs/guides/authentication): Auth patterns and middleware
- [Database Integration](https://hono.dev/docs/guides/database): Working with databases
- [File Upload](https://hono.dev/docs/guides/file-upload): Handling file uploads
- [WebSocket](https://hono.dev/docs/guides/websocket): WebSocket implementation
- [Caching](https://hono.dev/docs/guides/caching): Response caching strategies
- [Rate Limiting](https://hono.dev/docs/guides/rate-limiting): Rate limiting implementation
- [Monitoring](https://hono.dev/docs/guides/monitoring): Logging and monitoring

## Optional

- [Blog: The story of Hono](https://blog.cloudflare.com/the-story-of-web-framework-hono): History and design philosophy
- [Blog: Hono's RPC](https://blog.yusu.ke/hono-rpc/): Deep dive into RPC feature
- [YouTube: Hono Walkthrough](https://www.youtube.com/watch?v=dQw4w9WgXcQ): Video tutorial
- [Tutorial: Production-Ready Apps with Hono](https://freecodecamp.org/news/how-to-build-production-ready-web-apps-with-hono): Comprehensive guide
- [Tutorial: Hono with Zod OpenAPI](https://weaviate.io/blog/building-ai-search-with-hono): Building APIs with OpenAPI
- [Comparison: Hono vs Express](https://dev.to/hono-express-comparison): Framework comparison
- [Zod Documentation](https://zod.dev): Zod validation library
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers): Cloudflare Workers platform