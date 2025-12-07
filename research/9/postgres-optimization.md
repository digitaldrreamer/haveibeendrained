# PostgreSQL Performance Optimization for Have I Been Drained

## Table of Contents
1. [Indexing Strategies](#indexing-strategies)
2. [JSONB Optimization](#jsonb-optimization)
3. [Connection Pooling](#connection-pooling)
4. [Query Optimization](#query-optimization)
5. [Maintenance](#maintenance)
6. [Scaling Roadmap](#scaling-roadmap)
7. [Implementation Checklists](#implementation-checklists)

---

## Indexing Strategies

### Index Types Overview

| Index Type | Use Case | Trade-offs | When NOT to Use |
|---|---|---|---|
| **B-tree** (default) | Equality, range queries (`<`, `>`, `=`, `BETWEEN`, `IN`), sorting | Largest size, slower writes | Complex data types, spatial queries |
| **Hash** | Exact equality only (`=`) | Cannot handle range queries | Range queries, sorting requirements |
| **GIN** (Generalized Inverted) | JSONB, arrays, full-text search, key existence | Slower writes, larger maintenance cost | Low selectivity queries, equality only |
| **GiST** | Spatial data, geometric shapes, full-text search, range queries | Slower than B-tree for simple queries | Small tables, simple equality |
| **BRIN** | Time-series, large ordered tables (>1GB+) | Lower selectivity than B-tree | Random access patterns |
| **SP-GiST** | Hierarchical data, IP ranges | Specialized use cases | General-purpose queries |

### Index Strategy for Have I Been Drained Schema

#### Drainers Table
```sql
-- Primary lookup index (B-tree)
CREATE INDEX idx_drainers_wallet_address 
ON drainers(wallet_address) 
WHERE status = 'active';

-- For fraud pattern detection
CREATE INDEX idx_drainers_signature_hash 
ON drainers(signature_hash);

-- For time-range drains (BRIN for large dataset efficiency)
CREATE INDEX idx_drainers_last_activity_brin 
ON drainers USING BRIN (last_activity_timestamp)
WHERE status = 'active';

-- Composite index for common filter combinations
CREATE INDEX idx_drainers_status_type_date 
ON drainers(status, attack_type, created_at DESC)
WHERE status = 'active';
```

#### Analysis Cache Table
```sql
-- GIN index for efficient JSONB queries (analysis results)
CREATE INDEX idx_analysis_cache_results_gin 
ON analysis_cache USING GIN (analysis_results)
WHERE cache_hit = true;

-- Expression index for JSON key extraction
CREATE INDEX idx_analysis_cache_threat_level 
ON analysis_cache ((analysis_results->>'threat_level'))
WHERE (analysis_results->>'threat_level') IN ('high', 'critical');

-- Partial index for recent analyses
CREATE INDEX idx_analysis_cache_recent 
ON analysis_cache(wallet_address, analysis_timestamp)
WHERE analysis_timestamp > NOW() - INTERVAL '7 days';

-- B-tree for cache expiration
CREATE INDEX idx_analysis_cache_expires_at 
ON analysis_cache(expires_at) 
WHERE is_valid = true;
```

#### Reports Pending Table
```sql
-- Status-based partial index (only pending reports)
CREATE INDEX idx_reports_pending_status 
ON reports_pending(created_at DESC)
WHERE status = 'pending';

-- Quick lookup for specific report
CREATE INDEX idx_reports_pending_user_wallet 
ON reports_pending(user_id, wallet_address)
WHERE status IN ('pending', 'processing');

-- JSONB index for metadata filtering
CREATE INDEX idx_reports_metadata_gin 
ON reports_pending USING GIN (report_metadata)
WHERE status = 'pending';
```

### Partial Index Strategy

**When to use partial indexes:**
- Only 5-10% of rows match the filter (6-10x storage savings)
- Queries always filter on the same condition
- Reduces write overhead significantly

**Example: Active Drainers Only**
```sql
-- Instead of full index on 1M rows, create partial on 50K active drainers
CREATE INDEX idx_drainers_active_wallet 
ON drainers(wallet_address) 
WHERE status = 'active';

-- Query MUST use WHERE clause for index to be used
SELECT * FROM drainers 
WHERE status = 'active' AND wallet_address = 'solana_address'
-- Index used ✓

SELECT * FROM drainers 
WHERE wallet_address = 'solana_address'
-- Index NOT used (query doesn't filter on status)
```

### Index Creation Best Practices

```sql
-- Build indexes CONCURRENTLY to avoid locking
CREATE INDEX CONCURRENTLY idx_drainers_new 
ON drainers(wallet_address);

-- Use NULLS LAST for queries filtering NULL
CREATE INDEX idx_reports_completed_at 
ON reports_pending(created_at DESC NULLS LAST)
WHERE status = 'pending';

-- For case-insensitive email search (use expression index)
CREATE INDEX idx_users_email_lower 
ON users(LOWER(email));

-- Check index bloat
SELECT 
  schemaname, 
  tablename, 
  ROUND(100 * (OTTA - TUPLE_LEN)::numeric / OTTA, 2) AS bloat_ratio
FROM pgstattuple_approx(tablename)
WHERE bloat_ratio > 10
ORDER BY bloat_ratio DESC;

-- REINDEX if bloat > 20%
REINDEX INDEX CONCURRENTLY idx_drainers_wallet_address;
```

### Index Maintenance

```sql
-- Remove unused indexes (run every month)
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0 
AND schemaname != 'pg_catalog'
ORDER BY pg_relation_size(relid) DESC;

-- Drop unused indexes
DROP INDEX CONCURRENTLY idx_unused_index;

-- Analyze index effectiveness
EXPLAIN ANALYZE 
SELECT * FROM drainers 
WHERE status = 'active' AND wallet_address = 'solana_address';
-- Check if "Index Scan" appears (good) vs "Seq Scan" (bad)
```

---

## JSONB Optimization

### JSONB vs Normalization

**Use JSONB for:**
- Flexible/semi-structured data (analysis results, metadata)
- Infrequent schema changes
- Data that varies significantly between rows

**Normalize to columns if:**
- Column appears in >30% of queries
- Need to filter/sort frequently
- Want better performance (columns are faster than JSONB)

### Optimal JSONB Schema for Analysis Cache

```sql
-- Create with proper typing
CREATE TABLE analysis_cache (
  id BIGSERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  analysis_timestamp TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  
  -- Frequently queried fields as columns
  threat_level TEXT CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),
  is_valid BOOLEAN NOT NULL DEFAULT true,
  
  -- Complex/variable data in JSONB
  analysis_results JSONB NOT NULL,
  
  -- Track access patterns
  accessed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analysis results structure:
-- {
--   "detected_drains": [
--     {
--       "drainer_address": "...",
--       "transaction_count": 5,
--       "total_loss": "250000000",
--       "confidence": 0.95,
--       "last_activity": "2025-12-01T10:30:00Z"
--     }
--   ],
--   "attack_patterns": ["token_approval_spam", "msg_sender_swap"],
--   "recommendations": [...],
--   "metadata": {
--     "analysis_duration_ms": 245,
--     "data_sources": ["helius", "blockchain"],
--     "version": "1.0"
--   }
-- }
```

### JSONB Query Examples & Indexing

```sql
-- Query 1: Find high-threat analyses (uses GIN index)
SELECT wallet_address, threat_level, analysis_results
FROM analysis_cache
WHERE threat_level = 'critical'  -- Column is faster
  AND analysis_results @> '{"attack_patterns": ["token_approval_spam"]}'::jsonb
ORDER BY accessed_at DESC
LIMIT 100;

-- Index for this query
CREATE INDEX idx_analysis_critical_patterns_gin
ON analysis_cache USING GIN (analysis_results)
WHERE threat_level = 'critical';

-- Query 2: Extract specific JSON path (expression index)
SELECT 
  wallet_address,
  analysis_results->'detected_drains' AS detected_drains,
  (analysis_results->'metadata'->>'analysis_duration_ms')::integer AS duration_ms
FROM analysis_cache
WHERE (analysis_results->>'threat_level') = 'high';

-- Better: Use column instead
SELECT 
  wallet_address,
  analysis_results->'detected_drains' AS detected_drains,
  (analysis_results->'metadata'->>'analysis_duration_ms')::integer AS duration_ms
FROM analysis_cache
WHERE threat_level = 'high';

-- Query 3: Check for key existence
SELECT wallet_address
FROM analysis_cache
WHERE analysis_results ? 'detected_drains'
  AND analysis_results->>'is_expired' = 'false';

-- Index for key existence queries
CREATE INDEX idx_analysis_has_drains
ON analysis_cache USING GIN (analysis_results)
WHERE analysis_results ? 'detected_drains';

-- Query 4: Search in JSONB array
SELECT wallet_address
FROM analysis_cache
WHERE analysis_results->'attack_patterns' ?| ARRAY['msg_sender_swap', 'token_approval_spam'];

-- GIN index with jsonb_path_ops (smaller, more selective)
CREATE INDEX idx_analysis_patterns_gin_path
ON analysis_cache USING GIN (analysis_results jsonb_path_ops)
WHERE threat_level IN ('high', 'critical');
```

### JSONB Performance Tips

```sql
-- Avoid extracting entire document when possible
-- BAD
SELECT * FROM analysis_cache WHERE (analysis_results::text LIKE '%critical%');

-- GOOD: Use operators
SELECT * FROM analysis_cache WHERE threat_level = 'critical';

-- Type cast properly
-- BAD (string comparison, slow)
WHERE (analysis_results->>'duration_ms') > '1000'

-- GOOD (numeric comparison)
WHERE (analysis_results->>'duration_ms')::integer > 1000

-- Prefer containment queries with GIN
-- Faster with index
WHERE analysis_results @> '{"threat_level": "critical"}'::jsonb

-- vs slower without index
WHERE (analysis_results->>'threat_level') = 'critical'

-- Index specific paths for complex nested queries
CREATE INDEX idx_analysis_drainer_confidence
ON analysis_cache USING GIN ((analysis_results->'detected_drains') jsonb_path_ops);
```

---

## Connection Pooling

### Node.js pg-pool Configuration

```javascript
// lib/database.js
import { Pool } from 'pg';

export const pool = new Pool({
  // Connection details
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'have_i_been_drained',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  
  // Pool sizing (critical!)
  max: parseInt(process.env.DB_POOL_SIZE || '20'),
  min: parseInt(process.env.DB_POOL_MIN || '5'),
  
  // Connection timeout (prevent hanging)
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 5000, // 5 seconds
  
  // Statement timeout (prevent runaway queries)
  statement_timeout: 30000, // 30 seconds for normal queries
  
  // Logging
  ...(process.env.NODE_ENV === 'development' && {
    log: (...args) => console.log('[PG]', ...args),
  }),
  
  // Application name for monitoring
  application_name: 'have-i-been-drained',
  
  // Connection prepared statements
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Draining pool and closing server...');
  await pool.end();
  process.exit(0);
});

// Error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('New connection established');
});

pool.on('remove', () => {
  console.log('Connection removed from pool');
});
```

### Pool Size Calculation

```
Recommended Pool Size = (core_count * 2) + spare_connections

Example for typical Solana analysis workload:
- 4 CPU cores → (4 * 2) + 5 = ~13 connections
- 8 CPU cores → (8 * 2) + 5 = ~21 connections

For "Have I Been Drained":
- Development: 5-10
- Staging: 15-20
- Production: 20-30 (adjust based on load testing)

Monitor with:
SELECT count(*) as total_connections, 
       count(*) FILTER (WHERE state = 'active') as active,
       count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = 'have_i_been_drained';
```

### Connection Pool Monitoring

```javascript
// Monitoring helper
export function logPoolStats() {
  const stats = pool._clients;
  console.log(`Pool stats:
    Total available: ${stats.length}
    Total waiting: ${pool._waitingClient.length}
    Total clients created: ${pool.totalCount}
  `);
}

// Add to metrics endpoint
app.get('/health/db', async (c) => {
  try {
    const result = await pool.query('SELECT NOW()');
    
    // Get pool statistics
    const stats = {
      total_connections: pool.totalCount,
      idle_connections: pool._clients.length,
      waiting_requests: pool._waitingClient.length,
      active_connections: pool.totalCount - pool._clients.length,
      timestamp: result.rows[0].now,
    };
    
    // Warn if pool saturation > 80%
    const saturation = (stats.active_connections / stats.total_connections) * 100;
    if (saturation > 80) {
      console.warn(`Pool saturation at ${saturation.toFixed(2)}%`);
    }
    
    return c.json(stats);
  } catch (error) {
    return c.json({ error: 'Database connection failed' }, 500);
  }
});

// Query execution with timeout
export async function queryWithTimeout(query, values = [], timeoutMs = 10000) {
  const client = await pool.connect();
  
  try {
    await client.query(`SET statement_timeout TO ${timeoutMs}`);
    return await client.query(query, values);
  } finally {
    client.release();
  }
}
```

### Handling Pool Exhaustion

```javascript
// Detect and handle exhaustion
export async function executeWithRetry(
  queryFn,
  maxRetries = 3,
  delayMs = 100
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      if (error.code === 'ENOENT' || error.message.includes('no more connections')) {
        if (i < maxRetries - 1) {
          console.warn(`Pool exhausted, retry ${i + 1}/${maxRetries} after ${delayMs}ms`);
          await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
          continue;
        }
      }
      throw error;
    }
  }
}

// Circuit breaker pattern
class DatabaseCircuitBreaker {
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureCount = 0;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(queryFn) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN - too many failures');
    }

    try {
      const result = await queryFn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error('Circuit breaker OPEN after multiple failures');
      
      setTimeout(() => {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker HALF_OPEN - attempting recovery');
      }, this.resetTimeout);
    }
  }
}

export const dbCircuitBreaker = new DatabaseCircuitBreaker();
```

---

## Query Optimization

### Using EXPLAIN ANALYZE

```sql
-- Basic EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT d.id, d.wallet_address, COUNT(r.id) as report_count
FROM drainers d
LEFT JOIN reports_pending r ON d.id = r.drainer_id
WHERE d.status = 'active' AND d.created_at > NOW() - INTERVAL '7 days'
GROUP BY d.id, d.wallet_address
ORDER BY report_count DESC
LIMIT 50;

-- With BUFFERS for cache analysis
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, TIMING)
SELECT * FROM analysis_cache
WHERE threat_level = 'critical'
ORDER BY accessed_at DESC
LIMIT 20;

-- Interpretation guide:
-- Seq Scan = full table scan (bad for large tables)
-- Index Scan = using index (good)
-- Filter rows >> returned rows = inefficient filter
-- Shared Hit > 90% = good cache performance
-- Rows: actual > estimated = bad statistics (run ANALYZE)
```

### Common Query Anti-Patterns to Avoid

```sql
-- ANTI-PATTERN 1: SELECT *
-- Bad: Returns all columns, prevents index-only scans
SELECT * FROM drainers WHERE status = 'active';

-- Good: Return only needed columns
SELECT id, wallet_address, threat_level, created_at 
FROM drainers 
WHERE status = 'active';


-- ANTI-PATTERN 2: Unindexed JOINs
-- Bad: No index on join column
SELECT d.wallet_address, COUNT(r.id)
FROM drainers d
JOIN reports_pending r ON d.wallet_address = r.wallet_address
WHERE d.status = 'active';

-- Good: Ensure join column is indexed
CREATE INDEX idx_reports_wallet_address ON reports_pending(wallet_address);


-- ANTI-PATTERN 3: Functions in WHERE clause
-- Bad: Can't use index effectively
SELECT * FROM drainers 
WHERE LOWER(wallet_address) = LOWER($1);

-- Good: Create expression index and use consistently
CREATE INDEX idx_drainers_wallet_lower ON drainers(LOWER(wallet_address));
SELECT * FROM drainers WHERE LOWER(wallet_address) = LOWER($1);


-- ANTI-PATTERN 4: OR conditions without UNION
-- Bad: Can't use multiple indexes efficiently
SELECT * FROM drainers 
WHERE threat_level = 'critical' OR status = 'flagged';

-- Good: Use UNION with indexed columns
SELECT * FROM drainers WHERE threat_level = 'critical'
UNION
SELECT * FROM drainers WHERE status = 'flagged';


-- ANTI-PATTERN 5: Large OFFSET
-- Bad: Reads all previous rows unnecessarily
SELECT * FROM reports_pending 
WHERE status = 'pending'
ORDER BY created_at
OFFSET 50000 LIMIT 100;

-- Good: Use seek method (keyset pagination)
SELECT * FROM reports_pending 
WHERE status = 'pending' AND id > $last_id
ORDER BY id
LIMIT 100;


-- ANTI-PATTERN 6: Subqueries instead of JOINs
-- Bad: Executes subquery for each row (N+1)
SELECT d.id, d.wallet_address,
       (SELECT COUNT(*) FROM reports_pending WHERE drainer_id = d.id)
FROM drainers d
WHERE d.status = 'active';

-- Good: Use JOIN with GROUP BY
SELECT d.id, d.wallet_address, COUNT(r.id) as report_count
FROM drainers d
LEFT JOIN reports_pending r ON d.id = r.drainer_id
WHERE d.status = 'active'
GROUP BY d.id, d.wallet_address;
```

### Optimizing JOINs

```sql
-- Index strategy for JOIN optimization
-- For Nested Loop Join (good when outer table is small)
CREATE INDEX idx_reports_drainer_id ON reports_pending(drainer_id);

-- For Hash Join (both sides are large)
-- No specific index needed, just ensure good statistics

-- For Merge Join (both tables sorted on join key)
CREATE INDEX idx_drainers_id ON drainers(id);
CREATE INDEX idx_reports_drainer_id_sorted ON reports_pending(drainer_id, id);

-- Query:
EXPLAIN ANALYZE
SELECT d.wallet_address, 
       array_agg(DISTINCT r.attack_type) as attack_types,
       COUNT(r.id) as total_reports
FROM drainers d
INNER JOIN reports_pending r ON d.id = r.drainer_id
WHERE d.status = 'active' 
  AND r.status = 'pending'
  AND d.created_at > NOW() - INTERVAL '30 days'
GROUP BY d.id, d.wallet_address
HAVING COUNT(r.id) > 5
ORDER BY COUNT(r.id) DESC;

-- Optimization tricks:
-- 1. Start with smallest table
-- 2. Filter early (WHERE clause)
-- 3. Use appropriate indexes
-- 4. Monitor for "Filter" steps (use WHERE instead)
```

---

## Maintenance

### Autovacuum Tuning

```sql
-- For HIGH-WRITE tables (e.g., reports_pending)
ALTER TABLE reports_pending SET (
  -- Trigger vacuum more frequently
  autovacuum_vacuum_threshold = 1000,      -- instead of 50 (default)
  autovacuum_vacuum_scale_factor = 0.05,   -- instead of 0.2 (20% -> 5%)
  autovacuum_vacuum_cost_delay = 5,        -- be more aggressive
  autovacuum_vacuum_cost_limit = 10000,    -- increase cost limit
  autovacuum_analyze_threshold = 500,      -- refresh stats more often
  autovacuum_analyze_scale_factor = 0.02
);

-- For MODERATE tables (e.g., drainers)
ALTER TABLE drainers SET (
  autovacuum_vacuum_scale_factor = 0.1,    -- 10%
  autovacuum_vacuum_threshold = 5000,
  autovacuum_analyze_scale_factor = 0.05
);

-- For LOW-WRITE tables (e.g., user profiles)
ALTER TABLE users SET (
  autovacuum_vacuum_scale_factor = 0.2,    -- keep default
  autovacuum_vacuum_threshold = 10000,
  autovacuum_analyze_threshold = 5000
);

-- Enable autovacuum logging
ALTER SYSTEM SET log_autovacuum_min_duration = 0;
SELECT pg_reload_conf();

-- Check autovacuum status
SELECT 
  schemaname,
  relname,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  autovacuum_count,
  analyze_count
FROM pg_stat_user_tables
ORDER BY last_autovacuum DESC;
```

### Table Bloat Detection & Remediation

```sql
-- Create bloat monitoring extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgstattuple;

-- Find bloated tables
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
  ROUND(100 * (otta - tuple_len) / otta, 2) as bloat_percentage,
  n_dead_tup as dead_tuples,
  last_autovacuum
FROM pgstattuple_approx(
  (SELECT oid FROM pg_class WHERE relname = 'drainers')
) t
JOIN pg_stat_user_tables s ON s.relname = 'drainers'
WHERE (otta - tuple_len) > 0;

-- Detect dead tuples
WITH bloat_estimate AS (
  SELECT 
    schemaname,
    tablename,
    round(n_live_tup::numeric / nullif(n_tup_ins + n_tup_upd + n_tup_del, 0), 2) as live_to_modified_ratio,
    n_dead_tup,
    n_live_tup,
    n_tup_upd + n_tup_del as dead_tup_estimate
  FROM pg_stat_user_tables
)
SELECT *
FROM bloat_estimate
WHERE n_dead_tup > 10000 OR dead_tup_estimate > (n_live_tup * 0.1)
ORDER BY n_dead_tup DESC;

-- Remediation (choose based on bloat severity):

-- Option 1: For < 5% bloat - run VACUUM
VACUUM ANALYZE drainers;

-- Option 2: For 5-20% bloat - run VACUUM more aggressively
VACUUM FULL drainers;
REINDEX TABLE drainers;

-- Option 3: For > 20% bloat - rebuild table during maintenance window
BEGIN;
ALTER TABLE drainers RENAME TO drainers_old;
CREATE TABLE drainers AS SELECT * FROM drainers_old;
ALTER TABLE drainers ADD CONSTRAINT pk_drainers PRIMARY KEY (id);
-- Recreate all indexes here...
DROP TABLE drainers_old;
COMMIT;

-- For large tables, use pg_repack (low-lock alternative)
-- Install: CREATE EXTENSION pg_repack;
-- Run: SELECT pg_repack.repack_table('public.drainers');
```

### Regular Maintenance Schedule

```sql
-- Daily (automated via pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Every 6 hours - aggressive ANALYZE for frequently changing tables
SELECT cron.schedule('analyze-reports', '0 */6 * * *', 
  'ANALYZE reports_pending;'
);

-- Every night - REINDEX unused/bloated indexes
SELECT cron.schedule('reindex-maintenance', '2 0 * * *',
  'REINDEX INDEX CONCURRENTLY idx_drainers_wallet_address;'
);

-- Weekly - Check table bloat
SELECT cron.schedule('bloat-check', '0 2 * * 0',
  'SELECT pg_notify(''bloat_alert'', tablename || '': '' || bloat_percentage) 
   FROM bloat_report WHERE bloat_percentage > 10;'
);

-- Monthly - VACUUM FULL during low-traffic window (e.g., Sunday 3 AM)
SELECT cron.schedule('vacuum-full-reports', '0 3 * * 0',
  'VACUUM FULL reports_pending;'
);

-- Monthly index bloat cleanup
SELECT cron.schedule('reindex-all', '0 4 * * 1',
  'REINDEX INDEX CONCURRENTLY idx_drainers_active_wallet; 
   REINDEX INDEX CONCURRENTLY idx_analysis_recent;'
);
```

---

## Scaling Roadmap

### Growth Stages

#### Stage 1: 100-500 Daily Users (Current)
- Single PostgreSQL instance (8GB RAM, 4 CPU)
- Connection pool: 15-20
- Indexing: As specified in this guide
- Monitoring: pg_stat_statements + basic metrics
- Estimated QPS: 50-100

**Action:**
```sql
CREATE INDEX idx_drainers_wallet_address ON drainers(wallet_address);
CREATE INDEX idx_analysis_cache_results_gin ON analysis_cache USING GIN (analysis_results);
```

#### Stage 2: 500-2,000 Daily Users
- **Reads:** Introduce 1-2 read replicas
- **Caching:** Implement Redis for hot queries
- **Monitoring:** pganalyze or similar tool
- **Estimated QPS:** 100-300

**Architecture:**
```
Primary DB (writes) ← Helius RPC
  ├─ Read Replica 1 (analytics)
  └─ Read Replica 2 (API reads)

Plus Redis cache:
- analysis_cache results (TTL: 1 hour)
- drainer patterns (TTL: 6 hours)
```

#### Stage 3: 2,000-10,000 Daily Users
- **Vertical scaling:** Upgrade to 32GB RAM, 8-16 CPU
- **Horizontal scaling:** Plan for sharding
- **Optimization:** JSONB normalization for frequently accessed fields
- **Estimated QPS:** 300-1,000

**Implementation:**
```javascript
// Materialized views for reports dashboard
CREATE MATERIALIZED VIEW drainer_statistics AS
SELECT 
  DATE_TRUNC('day', created_at) as report_date,
  attack_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_reporters
FROM reports_pending
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), attack_type;

CREATE INDEX ON drainer_statistics(report_date DESC, attack_type);

-- Refresh every 6 hours
SELECT cron.schedule('refresh-stats', '0 */6 * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY drainer_statistics;'
);
```

#### Stage 4: 10,000+ Daily Users
- **Citus sharding:** Distribute by `wallet_address` or `user_id`
- **Write-heavy optimization:** Separate operational vs analytical database
- **Partitioning:** Time-based partitioning on reports_pending
- **Estimated QPS:** 1,000+

**Citus Implementation:**
```sql
-- Install Citus extension
CREATE EXTENSION citus;

-- Convert to distributed database
SELECT * from citus_add_node('worker1.db', 5432);
SELECT * from citus_add_node('worker2.db', 5432);

-- Create distributed tables (shard by wallet_address)
SELECT create_distributed_table('drainers', 'wallet_address');
SELECT create_distributed_table('reports_pending', 'wallet_address');

-- Analytical queries now parallelize automatically
SELECT attack_type, COUNT(*) as count
FROM reports_pending
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY attack_type;
```

### Read Replica Setup

```sql
-- On PRIMARY server
-- 1. Enable replication
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 10;
ALTER SYSTEM SET wal_keep_size = '1GB';
ALTER SYSTEM SET hot_standby = on;
SELECT pg_reload_conf();
SELECT pg_ctl_reload('primary');

-- 2. Create replication user
CREATE ROLE replication_user LOGIN REPLICATION ENCRYPTED PASSWORD 'secure_password';

-- 3. Allow replica connection in postgresql.conf
-- host    replication     replication_user    replica_ip/32    md5

-- On REPLICA server
-- 1. Take base backup
pg_basebackup -h primary.db -D /var/lib/postgresql/data -U replication_user -v -P -W

-- 2. Create standby.signal file
touch /var/lib/postgresql/data/standby.signal

-- 3. Start replica
pg_ctl start

-- Monitor replication lag
SELECT 
  slot_name,
  slot_type,
  active,
  restart_lsn,
  confirmed_flush_lsn
FROM pg_replication_slots;

-- On application (use pg_partman for read balancing)
const replicaPool = new Pool({
  host: 'read-replica.db',
  // ... other config
});

// Route writes to primary, reads to replica
const writeQuery = (sql, params) => pool.query(sql, params);
const readQuery = (sql, params) => replicaPool.query(sql, params);
```

### Time-Based Partitioning

```sql
-- Partition reports_pending by month (good for monthly archival)
CREATE TABLE reports_pending_2025_12 PARTITION OF reports_pending
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE reports_pending_2026_01 PARTITION OF reports_pending
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Auto-create partitions
CREATE EXTENSION IF NOT EXISTS pg_partman;

SELECT partman.create_parent(
  p_parent_table := 'public.reports_pending',
  p_control := 'created_at',
  p_type := 'native',
  p_interval := 'monthly',
  p_premake := 3
);

-- Benefits:
-- - Better query performance (partition pruning)
-- - Easier archival (drop old partitions)
-- - Parallel scanning
```

---

## Implementation Checklists

### Pre-Production Checklist

```
INDEXING
☐ Create B-tree indexes on all WHERE/JOIN/ORDER BY columns
☐ Create GIN index on analysis_cache.analysis_results
☐ Create partial indexes for status='active' queries
☐ Set up REINDEX schedule for bloat maintenance
☐ Run ANALYZE on all tables

JSONB OPTIMIZATION
☐ Normalize threat_level from JSONB to column
☐ Add expression indexes for frequently extracted JSON keys
☐ Test containment queries vs key extraction performance
☐ Document JSONB structure for team

CONNECTION POOLING
☐ Configure pg-pool with min/max based on load testing
☐ Add connection pool health check endpoint
☐ Implement circuit breaker for graceful degradation
☐ Monitor pool saturation in production

QUERY OPTIMIZATION
☐ Run EXPLAIN ANALYZE on all critical queries
☐ Fix N+1 query problems (use eager loading/JOINs)
☐ Remove SELECT * from production queries
☐ Test query performance with realistic data volume

MAINTENANCE
☐ Set up autovacuum monitoring and logging
☐ Configure per-table autovacuum settings
☐ Schedule monthly VACUUM FULL
☐ Set up bloat detection alerts
☐ Document maintenance procedures

MONITORING
☐ Set up pg_stat_statements extension
☐ Create dashboards for slow queries
☐ Alert on pool saturation > 80%
☐ Alert on table bloat > 10%
☐ Monitor replication lag (if using replicas)

TESTING
☐ Load test with 10x expected concurrent users
☐ Simulate query spikes (Black Swan events)
☐ Test connection pool exhaustion handling
☐ Verify backup/restore procedures
☐ Test failover (if using replicas)
```

### Performance Baseline

```javascript
// Baseline metrics to establish before scaling
const BASELINES = {
  // Query performance
  avg_query_time_ms: 50,
  p99_query_time_ms: 200,
  slow_queries_per_hour: 5,
  
  // Connection pool
  avg_pool_saturation: 0.3, // 30%
  pool_wait_p99_ms: 10,
  
  // Table health
  avg_table_bloat_pct: 5,
  avg_index_bloat_pct: 3,
  
  // Cache hit ratio
  cache_hit_ratio: 0.85,
  
  // Locks
  deadlocks_per_day: 0,
  avg_lock_wait_ms: 0,
};

// Monitor and alert if metrics degrade > 20%
function checkPerformanceRegression(current, baseline) {
  const threshold = 1.2; // 20% degradation
  for (const [metric, baseValue] of Object.entries(baseline)) {
    if (current[metric] > baseValue * threshold) {
      console.warn(`⚠️ Performance regression: ${metric} = ${current[metric]} (baseline: ${baseValue})`);
    }
  }
}
```

### Ongoing Monitoring Queries

```sql
-- Weekly: Slowest queries
SELECT 
  query,
  calls,
  ROUND(total_exec_time::numeric / calls, 2) as avg_exec_time_ms,
  ROUND(max_exec_time, 2) as max_exec_time_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Daily: Index health
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read - idx_tup_fetch as pages_inefficiently_read,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan > 0
ORDER BY pages_inefficiently_read DESC;

-- Hourly: Pool and lock status
SELECT 
  datname,
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active,
  COUNT(*) FILTER (WHERE state = 'idle') as idle,
  COUNT(*) FILTER (WHERE wait_event IS NOT NULL) as waiting
FROM pg_stat_activity
WHERE datname = 'have_i_been_drained'
GROUP BY datname;

-- Alert: Index fragmentation
SELECT 
  schemaname,
  tablename,
  indexname,
  ROUND(100.0 * (pg_relation_size(indexrelid) - pg_relation_size(indexrelid, 'main')) / 
         NULLIF(pg_relation_size(indexrelid), 0), 2) as fragmentation_pct
FROM pg_stat_user_indexes
WHERE ROUND(100.0 * (pg_relation_size(indexrelid) - pg_relation_size(indexrelid, 'main')) / 
           NULLIF(pg_relation_size(indexrelid), 0), 2) > 15;
```

---

## Cost Considerations

### Database Infrastructure

| Scale | Instance | Cost/Month | Details |
|-------|----------|-----------|---------|
| **Dev** | 1GB Heroku Postgres | $50 | Sufficient for testing |
| **Staging** | 4GB Heroku / AWS RDS | $150-200 | Mirror production |
| **Production (Stage 1-2)** | 8GB RDS/Heroku | $300-400 | Single instance + 1 replica |
| **Production (Stage 3)** | 32GB RDS + 2 replicas | $1,200-1,500 | Vertical scaling |
| **Production (Stage 4)** | Citus cluster (3 nodes) | $2,000+ | Horizontal scaling |

### Free/Generous Alternatives

1. **Neon (PostgreSQL as a Service)**
   - Free tier: 3 branches, 0.5 CPU, 3GB storage
   - Generous free: Enough for small production
   - Built-in connection pooling (PgBouncer)
   - Pay as you go after free tier

2. **Supabase** (PostgreSQL + Vector DB)
   - Free: 500MB database, 1GB file storage
   - Vector embeddings for AI features
   - Real-time subscriptions
   - Great for Solana wallet analysis

3. **Railway** (Infrastructure as a Service)
   - Free tier: $5 credit/month
   - Very affordable PostgreSQL ($0.30/hour after free tier)
   - Simple deployment

4. **PlanetScale** (MySQL alternative)
   - Free: Good for learning
   - Not PostgreSQL, but worth considering

**Recommendation for Have I Been Drained:**
- **Dev/Staging:** Neon free tier
- **Production:** Neon paid tier or Supabase (better for on-chain data)

### Optimization Savings

| Optimization | Implementation Cost | Monthly Savings | ROI |
|---|---|---|---|
| **Proper indexing** | 4 hours | $50-100 | Immediate |
| **Connection pooling** | 2 hours | $20-50 | 1-2 weeks |
| **Materialized views** | 8 hours | $100-200 | 1 month |
| **Read replicas** | 16 hours | $150-300 | 2-3 months |
| **Citus sharding** | 40+ hours | $500-1000+ | 3-6 months |

---

## Conclusion

The hierarchy of optimizations for Have I Been Drained:

1. **Immediate (Week 1):** Implement proper indexes, enable pg_stat_statements
2. **Week 2:** Configure connection pooling, fix N+1 queries
3. **Month 1:** Set up autovacuum monitoring, materialized views
4. **Months 2-3:** Add read replicas, performance monitoring dashboards
5. **Months 4+:** Consider horizontal scaling with Citus

**Start simple, monitor obsessively, scale when needed.**
