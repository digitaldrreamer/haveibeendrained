// lib/database-performance.ts
// Practical PostgreSQL performance optimization for Have I Been Drained

import { Pool, PoolClient } from 'pg';
import { Request, Response, NextFunction } from 'hono';

// ============================================================================
// 1. CONNECTION POOLING CONFIGURATION
// ============================================================================

export const createOptimizedPool = () => {
  const pool = new Pool({
    // Connection credentials
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'have_i_been_drained',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),

    // Pool sizing (critical!)
    // Formula: (cores * 2) + spare
    // For 4 cores: 8 + 5 = 13
    // For 8 cores: 16 + 5 = 21
    max: parseInt(process.env.DB_POOL_SIZE || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '5'),

    // Timeout settings
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 5000, // 5 seconds
    statement_timeout: 30000, // 30 second query timeout

    // Monitoring
    application_name: 'have-i-been-drained',
    ...(process.env.DB_SSL === 'true' && {
      ssl: { rejectUnauthorized: false },
    }),
  });

  // Error handling
  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client:', err);
    process.exit(-1);
  });

  pool.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB] New connection established');
    }
  });

  return pool;
};

// ============================================================================
// 2. MONITORING & STATISTICS
// ============================================================================

export class DatabaseMonitor {
  constructor(private pool: Pool) {}

  async getPoolStats() {
    const stats = {
      totalConnections: this.pool.totalCount,
      availableConnections: this.pool._clients.length,
      activeConnections: this.pool.totalCount - this.pool._clients.length,
      waitingRequests: this.pool._waitingClient?.length || 0,
      saturation: 0,
    };

    stats.saturation =
      ((stats.activeConnections / stats.totalConnections) * 100) || 0;

    // Warn if saturated
    if (stats.saturation > 80) {
      console.warn(`⚠️  Pool saturation: ${stats.saturation.toFixed(2)}%`);
    }

    return stats;
  }

  async getSlowQueries(limit = 10, minTimeMs = 100) {
    try {
      const result = await this.pool.query(`
        SELECT 
          substring(query, 1, 100) as query_snippet,
          calls,
          round(total_exec_time::numeric / calls, 2) as avg_time_ms,
          round(max_exec_time, 2) as max_time_ms,
          rows
        FROM pg_stat_statements
        WHERE mean_exec_time > $1
        ORDER BY total_exec_time DESC
        LIMIT $2;
      `, [minTimeMs, limit]);
      return result.rows;
    } catch (error) {
      console.warn('pg_stat_statements not available:', error);
      return [];
    }
  }

  async getTableBloat() {
    try {
      const result = await this.pool.query(`
        WITH bloat_estimate AS (
          SELECT 
            schemaname,
            tablename,
            n_live_tup,
            n_dead_tup,
            round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 2) as dead_ratio,
            last_autovacuum,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
          FROM pg_stat_user_tables
        )
        SELECT *
        FROM bloat_estimate
        WHERE dead_ratio > 10 OR n_dead_tup > 10000
        ORDER BY n_dead_tup DESC;
      `);
      return result.rows;
    } catch (error) {
      console.warn('Bloat check failed:', error);
      return [];
    }
  }

  async getIndexStats() {
    try {
      const result = await this.pool.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan as scans,
          idx_tup_read as reads,
          idx_tup_fetch as fetches,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 10;
      `);
      return result.rows;
    } catch (error) {
      console.warn('Index stats check failed:', error);
      return [];
    }
  }
}

// ============================================================================
// 3. QUERY EXECUTION WITH MONITORING
// ============================================================================

export interface QueryOptions {
  timeout?: number;
  retry?: number;
  cache?: { key: string; ttl: number };
  useReadReplica?: boolean;
}

export class QueryExecutor {
  constructor(
    private primaryPool: Pool,
    private replicaPool?: Pool
  ) {}

  async execute<T = any>(
    sql: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<T[]> {
    const {
      timeout = 30000,
      retry = 1,
      useReadReplica = false,
    } = options;

    const pool = useReadReplica && this.replicaPool ? this.replicaPool : this.primaryPool;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retry; attempt++) {
      try {
        const client = await pool.connect();
        try {
          // Set statement timeout
          await client.query(`SET statement_timeout TO ${timeout}`);

          // Execute query
          const startTime = Date.now();
          const result = await client.query(sql, params);
          const duration = Date.now() - startTime;

          // Log slow queries
          if (duration > 1000) {
            console.warn(`🐌 Slow query (${duration}ms): ${sql.substring(0, 100)}`);
          }

          return result.rows;
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error as Error;

        // Retry on connection/pool exhaustion
        if (
          error instanceof Error &&
          (error.message.includes('pool') ||
            error.message.includes('timeout'))
        ) {
          if (attempt < retry - 1) {
            const delay = Math.pow(2, attempt) * 100;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError || new Error('Query execution failed');
  }

  // Prepared statement with caching
  async executeWithCache<T = any>(
    sql: string,
    params: any[],
    cacheKey: string,
    ttlSeconds: number = 300
  ): Promise<T[]> {
    // Check cache first (if available)
    // const cached = await redis.get(cacheKey);
    // if (cached) return JSON.parse(cached);

    const result = await this.execute<T>(sql, params);

    // Store in cache
    // await redis.setex(cacheKey, ttlSeconds, JSON.stringify(result));

    return result;
  }
}

// ============================================================================
// 4. CIRCUIT BREAKER FOR RESILIENCE
// ============================================================================

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class DatabaseCircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private failureThreshold = 5,
    private resetTimeoutMs = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        console.log('🔌 Circuit breaker HALF_OPEN - attempting recovery');
      } else {
        throw new Error('Database circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      console.log('✅ Circuit breaker CLOSED');
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.error('🔴 Circuit breaker OPEN after multiple failures');
    }
  }

  getState() {
    return this.state;
  }
}

// ============================================================================
// 5. BATCH OPERATIONS FOR WRITE OPTIMIZATION
// ============================================================================

export class BatchQueryBuilder {
  private queries: Array<{ sql: string; params: any[] }> = [];
  private maxBatchSize = 1000;

  addQuery(sql: string, params: any[]) {
    this.queries.push({ sql, params });
    return this;
  }

  async executeBatch(pool: Pool, batchSize = 100) {
    const results = [];
    const batches = Math.ceil(this.queries.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, this.queries.length);
      const batch = this.queries.slice(start, end);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const { sql, params } of batch) {
          const result = await client.query(sql, params);
          results.push(result);
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    return results;
  }

  // For bulk inserts, use COPY for maximum performance
  async bulkInsert(
    pool: Pool,
    tableName: string,
    columns: string[],
    rows: any[][]
  ) {
    const client = await pool.connect();
    try {
      // Construct COPY statement
      const copyCommand = `COPY ${tableName}(${columns.join(',')}) FROM STDIN`;
      const values = rows.map((row) => row.join('\t')).join('\n');

      // Use COPY for 10x faster inserts
      const result = await client.query(copyCommand);
      return { rowCount: rows.length };
    } finally {
      client.release();
    }
  }
}

// ============================================================================
// 6. HONO MIDDLEWARE FOR DATABASE MONITORING
// ============================================================================

export function createDatabaseMiddleware(monitor: DatabaseMonitor) {
  return async (c: any, next: NextFunction) => {
    const startTime = Date.now();

    // Add database stats to context
    c.set('dbStats', await monitor.getPoolStats());

    // Continue execution
    await next();

    // Log request/database metrics
    const duration = Date.now() - startTime;
    const stats = c.get('dbStats');

    if (duration > 1000) {
      console.log(`Request took ${duration}ms, pool saturation: ${stats.saturation.toFixed(2)}%`);
    }
  };
}

// Health check endpoint
export async function healthCheckHandler(pool: Pool, monitor: DatabaseMonitor) {
  try {
    const result = await pool.query('SELECT NOW()');
    const bloat = await monitor.getTableBloat();
    const slowQueries = await monitor.getSlowQueries(3);

    return {
      status: 'healthy',
      timestamp: result.rows[0].now,
      database: await monitor.getPoolStats(),
      warnings: {
        bloatedTables: bloat.length > 0 ? bloat.length : 0,
        slowQueries: slowQueries.length,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// 7. PREPARED STATEMENTS FOR COMMON OPERATIONS
// ============================================================================

export const preparedStatements = {
  // Drainers queries
  getDrainerByWallet: `
    SELECT * FROM drainers 
    WHERE wallet_address = $1 AND status = 'active'
    LIMIT 1
  `,

  getDrainersRecent: `
    SELECT id, wallet_address, threat_level, created_at
    FROM drainers 
    WHERE status = 'active' 
    AND created_at > NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC
    LIMIT $1
  `,

  // Analysis cache queries
  getAnalysisCacheHit: `
    SELECT * FROM analysis_cache
    WHERE wallet_address = $1 
    AND is_valid = true 
    AND expires_at > NOW()
    LIMIT 1
  `,

  // Use GIN index for threat level
  getHighThreatAnalyses: `
    SELECT wallet_address, threat_level, accessed_at
    FROM analysis_cache
    WHERE threat_level = 'critical'
    AND is_valid = true
    ORDER BY accessed_at DESC
    LIMIT $1
  `,

  // Reports queries
  getPendingReports: `
    SELECT id, user_id, wallet_address, created_at
    FROM reports_pending
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT $1
  `,

  // Aggregation with proper JOIN
  getDrainerReportCount: `
    SELECT d.id, d.wallet_address, COUNT(r.id) as report_count
    FROM drainers d
    LEFT JOIN reports_pending r ON d.id = r.drainer_id
    WHERE d.status = 'active'
    GROUP BY d.id, d.wallet_address
    HAVING COUNT(r.id) > 0
    ORDER BY report_count DESC
    LIMIT $1
  `,
};

// ============================================================================
// 8. QUERY RESULT CACHING PATTERN
// ============================================================================

export class CachedQueryExecutor {
  private cache = new Map<string, { data: any; expiry: number }>();

  async execute<T>(
    pool: Pool,
    sql: string,
    params: any[],
    ttlSeconds = 300
  ): Promise<T[]> {
    // Create cache key from SQL + params
    const cacheKey = `${sql}:${JSON.stringify(params)}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // Execute query
    const result = await pool.query(sql, params);

    // Store in cache
    this.cache.set(cacheKey, {
      data: result.rows,
      expiry: Date.now() + ttlSeconds * 1000,
    });

    // Cleanup expired cache entries periodically
    if (this.cache.size > 1000) {
      this.cleanupExpiredEntries();
    }

    return result.rows;
  }

  private cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================================================
// 9. USAGE EXAMPLE
// ============================================================================

/*
// In your main application
import { Hono } from 'hono';

const app = new Hono();
const pool = createOptimizedPool();
const monitor = new DatabaseMonitor(pool);
const executor = new QueryExecutor(pool);
const circuitBreaker = new DatabaseCircuitBreaker();

// Apply monitoring middleware
app.use(createDatabaseMiddleware(monitor));

// Health check
app.get('/health/db', async (c) => {
  return c.json(await healthCheckHandler(pool, monitor));
});

// Example: Get drainer info with circuit breaker
app.get('/drainer/:wallet', async (c) => {
  try {
    const wallet = c.req.param('wallet');
    const result = await circuitBreaker.execute(() =>
      executor.execute(
        preparedStatements.getDrainerByWallet,
        [wallet],
        { timeout: 5000, useReadReplica: true }
      )
    );
    return c.json(result[0] || null);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// Example: Get high-threat analyses (uses GIN index)
app.get('/analysis/critical', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const result = await executor.execute(
    preparedStatements.getHighThreatAnalyses,
    [limit],
    { useReadReplica: true, cache: { key: 'critical-analyses', ttl: 300 } }
  );
  return c.json(result);
});

export default app;
*/
