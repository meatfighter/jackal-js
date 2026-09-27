import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "node:url";

let nextServer = 0;

/** Concurrent Node test workers and in-memory mutation servers must not rebuild
 * or remove one another's dependency cache. Browser/build servers stay unchanged. */
export function createServer(options) {
    return createViteServer({
        ...options,
        cacheDir: fileURLToPath(new URL(`../node_modules/.vite-tests/${process.pid}-${nextServer++}/`, import.meta.url))
    });
}
