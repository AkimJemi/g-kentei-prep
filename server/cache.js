
import { LRUCache } from 'lru-cache';

class CacheManager {
    constructor() {
        // Static data (Categories) - Long TTL (24 hours)
        this.staticCache = new LRUCache({
            max: 100,
            ttl: 1000 * 60 * 60 * 24,
        });

        // Query results (Questions list) - Medium TTL (5 minutes)
        this.queryCache = new LRUCache({
            max: 500,
            ttl: 1000 * 60 * 5,
        });

        // User data - Short TTL (1 minute) to reflect status changes quickly
        this.userCache = new LRUCache({
            max: 1000,
            ttl: 1000 * 60 * 1,
        });
        
        console.log('[Neural Cache] Initialized LRU Cache Systems');
    }

    // Generic Get
    get(type, key) {
        switch(type) {
            case 'static': return this.staticCache.get(key);
            case 'query': return this.queryCache.get(key);
            case 'user': return this.userCache.get(key);
            default: return null;
        }
    }

    // Generic Set
    set(type, key, value) {
        switch(type) {
            case 'static': this.staticCache.set(key, value); break;
            case 'query': this.queryCache.set(key, value); break;
            case 'user': this.userCache.set(key, value); break;
        }
    }

    // Invalidation
    invalidate(type, key = null) {
        if (key) {
            switch(type) {
                case 'static': this.staticCache.delete(key); break;
                case 'query': this.queryCache.delete(key); break;
                case 'user': this.userCache.delete(key); break;
            }
        } else {
            // Clear entire cache for type (e.g., when adding a new question, clear all question query caches)
            switch(type) {
                case 'static': this.staticCache.clear(); break;
                case 'query': this.queryCache.clear(); break;
                case 'user': this.userCache.clear(); break;
            }
            console.log(`[Neural Cache] Invalidated all ${type} cache`);
        }
    }
}

export const cache = new CacheManager();
