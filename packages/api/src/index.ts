import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { readFileSync } from 'fs';
import { join } from 'path';
import checkAction from './routes/actions/check';
import reportAction from './routes/actions/report';
import analyzeRoutes from './routes/analyze';
import reportRoutes from './routes/report';
import publicApiRoutes from './routes/public-api';
import internalApiRoutes from './routes/internal-api';
import apiKeysRoutes from './routes/api-keys';
import openApiRoutes from './routes/openapi';

const app = new Hono();

// Configure CORS based on environment
// In dev: allow all origins (*)
// In prod: allow only specific domains
// Can be overridden via CORS_ORIGIN env var (comma-separated for multiple origins)
const getCorsOrigin = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  }
  // Default: allow all in dev, specific domains in prod
  return process.env.NODE_ENV === 'production'
    ? ['https://haveibeendrained.org', 'https://www.haveibeendrained.org']
    : '*';
};

const corsOrigin = getCorsOrigin();

// Apply CORS only to internal/private API routes
// Internal routes that need CORS (restricted to frontend domain):
// - /api/internal/* (internal API endpoints - NO rate limiting)
// - /api/analyze (legacy internal analyze endpoint)
// - /api/report/:address (GET - internal lookup, not POST which is public)
//
// Public routes (NO CORS - accessible from anywhere):
// - /api/v1/* (all public API v1 routes including keys endpoints - WITH rate limiting)
// - /api/openapi.* (OpenAPI specification)
// - /api/actions/check (Solana Actions API)
// - /api/report (POST - submit reports)
// - /api/health (health check)

// Internal API endpoints - CORS-protected, no rate limits
app.use('/api/internal/*', cors({
  origin: corsOrigin,
  allowMethods: ['GET', 'HEAD', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true,
}));

// Legacy internal endpoints
app.use('/api/analyze', cors({
  origin: corsOrigin,
  allowMethods: ['GET', 'HEAD', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true,
}));

// Apply CORS only to GET /api/report/:address (internal lookup)
// POST /api/report is public and should not have CORS
app.use('/api/report/:address', cors({
  origin: corsOrigin,
  allowMethods: ['GET', 'HEAD', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true,
}));

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

// GET /actions.json - Solana Actions root configuration
// Required for Blinks to map action URLs
// Must have CORS headers for cross-origin access
app.get('/actions.json', (c) => {
  return c.json({
    rules: [
      {
        pathPattern: '/check',
        apiPath: '/api/actions/check'
      },
      {
        pathPattern: '/report',
        apiPath: '/api/actions/report'
      }
    ]
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    }
  });
});

// OPTIONS handler for actions.json (CORS preflight)
app.options('/actions.json', (c) => {
  return c.text('', 204, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
});

// GET /icon.png - Solana Actions icon
// Serves the converted 512x512 PNG logo
// Must have CORS headers for cross-origin access
app.get('/icon.png', (c) => {
  // Serve the static PNG file (converted from logo.svg)
  const pngPath = join(process.cwd(), 'packages/api/public/icon.png');
  
  try {
    const pngBuffer = readFileSync(pngPath);
    return c.body(pngBuffer, 200, {
      headers: {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      }
    });
  } catch (error) {
    console.error('Failed to read PNG icon:', error);
    return c.json({ error: 'Icon not found' }, 404);
  }
});

// Mount routes
// Public routes (NO CORS - accessible from anywhere, WITH rate limiting):
app.route('/', publicApiRoutes); // Public API v1 routes (/api/v1/*)
app.route('/', openApiRoutes); // OpenAPI specification (/api/openapi.*)
app.route('/', checkAction); // Solana Actions API (/api/actions/check)
app.route('/', reportAction); // Solana Actions API (/api/actions/report)
app.route('/', apiKeysRoutes); // API key management (/api/v1/keys/*) - public but requires auth
app.route('/', reportRoutes); // Report routes - POST is public, GET /:address is internal
// Internal routes (WITH CORS - restricted to frontend domain, NO rate limiting):
app.route('/', internalApiRoutes); // Internal API endpoints (/api/internal/*)
app.route('/', analyzeRoutes); // Legacy internal analyze endpoint (/api/analyze)

// Start server
const port = parseInt(process.env.API_PORT || '3001', 10);
const hostname = '0.0.0.0';

export default {
  port,
  fetch: app.fetch,
};

// For Bun runtime
if (typeof Bun !== 'undefined') {
  Bun.serve({
    port,
    hostname,
    fetch: app.fetch,
    idleTimeout: 60, // 60 seconds timeout for long-running requests
  });
  console.log(`🚀 API server running on http://${hostname}:${port}`);
}
