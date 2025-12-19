import { Hono } from 'hono';
import { openApiSpec } from '../lib/openapi-spec';

const app = new Hono();

/**
 * GET /api/openapi.json
 * Returns the OpenAPI specification for the public API
 */
app.get('/api/openapi.json', (c) => {
  return c.json(openApiSpec);
});

/**
 * GET /api/openapi.yaml
 * Returns the OpenAPI specification in YAML format
 */
app.get('/api/openapi.yaml', (c) => {
  // For now, return JSON (can add YAML conversion later if needed)
  return c.json(openApiSpec, 200, {
    'Content-Type': 'application/yaml',
  });
});

export default app;

