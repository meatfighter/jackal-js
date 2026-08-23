import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, resolve } from "node:path";
import { defineConfig } from "vite";
import type { Plugin, ResolvedConfig } from "vite";
import versionFileInfo from "../version.json";

const APP_VERSION_TOKEN = "__APP_VERSION__";
const BUILD_STAMP_TOKEN = "__BUILD_STAMP__";
const BASE_URL_TOKEN = "__BASE_URL__";
const rootDir = fileURLToPath(new URL(".", import.meta.url));
const pwaOutDir = process.env.JACKAL_PWA_OUT_DIR ?? "../.release-components/pwa";
const buildVersionEnv = "JACKAL_BUILD_VERSION_JSON";

function readBuildVersionInfo(): typeof versionFileInfo {
    const override = process.env[buildVersionEnv];
    if (override === undefined) {
        return versionFileInfo;
    }

    const parsed = JSON.parse(override) as typeof versionFileInfo;
    if (typeof parsed.version !== "string" || typeof parsed.buildStamp !== "string") {
        throw new Error(`${buildVersionEnv} must contain version and buildStamp strings.`);
    }
    return parsed;
}

const versionInfo = readBuildVersionInfo();

function normalizeBaseUrl(baseUrl: string): string {
    if (baseUrl.length === 0) {
        return "/";
    }
    return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function applyBuildTokens(content: string, baseUrl: string): string {
    return content
        .replaceAll(APP_VERSION_TOKEN, versionInfo.version)
        .replaceAll(BUILD_STAMP_TOKEN, versionInfo.buildStamp)
        .replaceAll(BASE_URL_TOKEN, normalizeBaseUrl(baseUrl));
}

function collectPrecacheResources(dir: string, baseDir = dir): string[] {
    const rootStat = lstatSync(dir);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
        throw new Error(`PWA precache root must be a real directory: ${dir}`);
    }

    const resources: string[] = [];
    for (const entry of readdirSync(dir).sort((a, b) => a.localeCompare(b))) {
        const path = join(dir, entry);
        const stat = lstatSync(path);
        if (stat.isSymbolicLink()) {
            throw new Error(`PWA precache entry must not be a symlink or junction: ${path}`);
        }
        if (stat.isDirectory()) {
            resources.push(...collectPrecacheResources(path, baseDir));
            continue;
        }
        if (!stat.isFile()) {
            throw new Error(`PWA precache entry must be a regular file or directory: ${path}`);
        }

        const ref = relative(baseDir, path).replaceAll("\\", "/");
        if (ref === "sw.js") {
            continue;
        }
        resources.push(`./${ref}`);
    }
    return resources;
}

function applyServiceWorkerBuildOutput(content: string, outDir: string, baseUrl: string): string {
    const resources = Array.from(new Set(["./", ...collectPrecacheResources(outDir)]));
    return applyBuildTokens(content, baseUrl).replace(
        /const APP_STATIC_RESOURCES = \[[\s\S]*?\];/,
        `const APP_STATIC_RESOURCES = ${JSON.stringify(resources, null, 4)};`
    );
}

function versionedStaticAssets(): Plugin {
    let resolvedConfig: ResolvedConfig | null = null;

    return {
        name: "jackal-versioned-static-assets",
        configResolved(config) {
            resolvedConfig = config;
        },
        transformIndexHtml: {
            order: "pre",
            handler(html) {
                return applyBuildTokens(html, resolvedConfig?.base ?? "/");
            }
        },
        configureServer(server) {
            server.middlewares.use((request, response, next) => {
                const requestUrl = request.url;
                if (requestUrl === undefined) {
                    next();
                    return;
                }
                let pathname: string;
                try {
                    pathname = new URL(requestUrl, "http://localhost").pathname;
                } catch {
                    next();
                    return;
                }
                if (pathname !== "/sw.js" && pathname !== "/manifest.webmanifest") {
                    next();
                    return;
                }

                const filePath = join(server.config.root, "public", pathname.slice(1));
                if (!existsSync(filePath)) {
                    next();
                    return;
                }

                response.statusCode = 200;
                response.setHeader("Content-Type", pathname === "/sw.js" ? "text/javascript; charset=utf-8" : "application/manifest+json; charset=utf-8");
                response.end(applyBuildTokens(readFileSync(filePath, "utf8"), server.config.base));
            });
        },
        closeBundle() {
            if (resolvedConfig === null || resolvedConfig.command !== "build") {
                return;
            }
            const outDir = resolve(resolvedConfig.root, resolvedConfig.build.outDir);
            const serviceWorkerPath = join(outDir, "sw.js");
            if (existsSync(serviceWorkerPath)) {
                writeFileSync(serviceWorkerPath, applyServiceWorkerBuildOutput(readFileSync(serviceWorkerPath, "utf8"), outDir, resolvedConfig.base));
            }

            const manifestPath = join(outDir, "manifest.webmanifest");
            if (existsSync(manifestPath)) {
                writeFileSync(manifestPath, applyBuildTokens(readFileSync(manifestPath, "utf8"), resolvedConfig.base));
            }
        }
    };
}

export default defineConfig(({ command }) => ({
    root: rootDir,
    base: command === "build" ? "./" : "/",
    plugins: [versionedStaticAssets()],
    define: {
        __APP_VERSION__: JSON.stringify(versionInfo.version),
        __BUILD_STAMP__: JSON.stringify(versionInfo.buildStamp)
    },
    build: {
        outDir: pwaOutDir,
        emptyOutDir: true,
        target: "es2022",
        sourcemap: false
    },
    server: {
        host: "127.0.0.1",
        port: 5173
    },
    preview: {
        port: 4173,
        strictPort: false
    }
}));
