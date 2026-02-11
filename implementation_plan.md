# Server-Side Caching Implementation Plan

## Goal Description
Implement an **LRU (Least Recently Used) Caching Strategy** for the backend API.
The goal is to reduce response times and mitigate timeouts for read-heavy operations, especially for `api/categories` and `api/questions`, by avoiding redundant round-trips to the remote PostgreSQL database.

## User Review Required
> [!NOTE]
> This requires installing `lru-cache` as a production dependency.
> Cache invalidation logic will be added to mutation endpoints (POST/PUT/DELETE) to ensure data freshness.

## Proposed Changes

### Configuration & Dependencies
#### [MODIFY] [package.json](file:///c:/antigravity_workspace/g-kentei-prep/package.json)
- Add `lru-cache` to `dependencies`.

### New Modules
#### [NEW] [server/cache.js](file:///c:/antigravity_workspace/g-kentei-prep/server/cache.js)
- Implement `CacheManager` class wrapping `lru-cache`.
- Define specific caches:
    - `staticCache`: For categories (TTL: 24h)
    - `queryCache`: For expensive list queries (TTL: 5m)
    - `userCache`: For user data (TTL: 1m)

### Server Integration
#### [MODIFY] [server/index.js](file:///c:/antigravity_workspace/g-kentei-prep/server/index.js)
- Import `CacheManager`.
- **Read Operations**:
    - Wrap `GET /api/categories` with `staticCache`.
    - Wrap `GET /api/questions` with `queryCache` (key based on query params).
    - Wrap `GET /api/users` with `userCache`.
- **Write Operations (Invalidation)**:
    - Invalidate `categories` cache on Category CRUD.
    - Invalidate `questions` cache on Question CRUD.
    - Invalidate `users` cache on User CRUD.

## Verification Plan

### Manual Verification
1. **Performance Test**: Re-run `npm run test:perf` and verify significant improvement in `Requests/sec` and reduced latency.
2. **Freshness Test**:
    - Build cache by querying `GET /api/categories`.
    - Modify a category via `PUT /api/admin/categories/:id`.
    - Query `GET /api/categories` again and verify the change is reflected (cache invalidated).
