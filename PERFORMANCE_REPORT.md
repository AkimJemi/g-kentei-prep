# G-Kentei Prep Performance Test Report

## Summary
- **Date**: 2026-02-11
- **Tool**: `autocannon` (Node.js)
- **Target**: Local Dev Server (`http://localhost:3012`) with Remote PostgreSQL (Render)

## Results

| Endpoint | Concurrency | Requests/sec | Latency (p50) | Latency (p99) | Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `GET /api/categories` | 10 | ~58 | 159 ms | 4160 ms | ✅ PASS |
| `GET /api/users?limit=10` | 10 | ~7.7 | 1284 ms | 1788 ms | ⚠️ SLOW |
| `GET /api/questions?limit=10` | 1 | ~2.6 | ~400 ms | - | ⚠️ SLOW |
| `GET /api/questions?limit=10` | 10 | 0 | - | - | ❌ FAIL (Non-2xx / Timeouts) |

## Analysis
1.  **Remote Database Latency**: The application connects to a remote PostgreSQL instance on Render. This introduces significant latency (approx. 150ms-400ms per round trip).
2.  **N+1 / Multiple Queries**: Endpoints like `api/questions` (paginated) perform a `COUNT(*)` query followed by a `SELECT` query, doubling the round-trip time.
3.  **Concurrency Bottleneck**: When concurrency increases to 10, the `api/questions` endpoint fails, possibly due to:
    - Database connection pool exhaustion.
    - Render free tier connection limits.
    - Long query execution times causing request timeouts.

## Recommendations
1.  **Implement Caching**: Use a local cache (e.g., in-memory or Redis) for static data like `api/categories` and frequently accessed `api/questions`.
2.  **Optimize Queries**: Combine count and select queries if possible, or use estimated counts.
3.  **Connection Pooling**: Adjust `pg.Pool` settings to handle higher concurrency or match the database limits.
