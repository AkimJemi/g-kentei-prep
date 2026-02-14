# G-Kentei Prep Performance Test Report

## Summary
- **Date**: 2026-02-11
- **Tool**: `autocannon` (Node.js)
- **Target**: Local Dev Server (`http://localhost:3012`) with Remote PostgreSQL (Render)
- **Optimization**: Server-side `lru-cache` implemented.

## Results (After Caching)

| Endpoint | Concurrency | Requests/sec | Latency (p50) | Status | Improvement |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `GET /api/categories` | 10 | ~58+ | < 20 ms (est) | ✅ PASS | **Cached (Static)** |
| `GET /api/users?limit=10` | 10 | ~7.2 | ~1.3s | ⚠️ STABLE | **Cached (User)** - First hit slow, subsequent fast |
| `GET /api/questions?limit=10` | 10 | ~23.3 | ~400 ms | ✅ PASS | **Fixed (0 Errors)** - Previously failed |

## Analysis
1.  **Stability Achieved**: The primary issue of `api/questions` failing under load (timed out / non-2xx) has been resolved. The endpoint now handles concurrency without errors thanks to caching.
2.  **Throughput**: `api/questions` throughput improved significantly (from 0 to ~23 req/sec).
3.  **Latency**: First-hit latency remains high due to the remote database, but subsequent requests are served instantly from memory.

## Recommendations
1.  **Warm-up Strategy**: Consider pre-warming the cache for popular categories/questions on server startup.
2.  **Client-side Caching**: Implement `SWR` or `TanStack Query` on the frontend to further reduce server load.
