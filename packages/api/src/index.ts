import { Hono } from 'hono';
import checkAction from './routes/actions/check';
import analyzeRoutes from './routes/analyze';
import reportRoutes from './routes/report';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

// Mount routes
app.route('/', analyzeRoutes);
app.route('/', reportRoutes);
app.route('/', checkAction);

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
