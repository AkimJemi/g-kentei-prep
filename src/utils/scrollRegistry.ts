/**
 * ScrollRegistry — Global scroll position registry.
 *
 * Any component that has a scrollable area can register itself here.
 * The SavePoint system reads from and writes to this registry.
 *
 * Usage (in a component):
 *   useEffect(() => {
 *     scrollRegistry.register('myView-panel', {
 *       getScrollTop: () => ref.current?.scrollTop ?? 0,
 *       setScrollTop: (top) => { if (ref.current) ref.current.scrollTop = top; },
 *     });
 *     return () => scrollRegistry.unregister('myView-panel');
 *   }, []);
 */

interface ScrollEntry {
    getScrollTop: () => number;
    setScrollTop: (top: number) => void;
}

const registry = new Map<string, ScrollEntry>();

export const scrollRegistry = {
    /** Register a scrollable container under a unique key. */
    register(key: string, entry: ScrollEntry): void {
        registry.set(key, entry);
    },

    /** Unregister when the component unmounts. */
    unregister(key: string): void {
        registry.delete(key);
    },

    /** Capture scroll positions of all registered containers. */
    captureAll(): Record<string, number> {
        const positions: Record<string, number> = {};
        registry.forEach((entry, key) => {
            positions[key] = entry.getScrollTop();
        });
        return positions;
    },

    /** Restore scroll positions from a previously captured snapshot. */
    restoreAll(positions: Record<string, number>): void {
        Object.entries(positions).forEach(([key, top]) => {
            const entry = registry.get(key);
            if (entry) {
                entry.setScrollTop(top);
            }
        });
    },
};
