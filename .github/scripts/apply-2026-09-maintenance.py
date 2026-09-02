from pathlib import Path
import json
import re


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


def remove_once(path: str, text_to_remove: str) -> None:
    replace_once(path, text_to_remove, "")


# -----------------------------------------------------------------------------
# Dependency and scripts
# -----------------------------------------------------------------------------
package_path = Path("package.json")
package = json.loads(package_path.read_text())
package["dependencies"]["slick2d-ts"] = "git+https://github.com/meatfighter/slick2d-ts.git#semver:^1.5.3"
package["scripts"]["verify:browser"] = "node scripts/run-browser-verification.mjs"
package_path.write_text(json.dumps(package, indent=4) + "\n")

replace_once("scripts/test-buffered-scaling-wiring.mjs", "const minimumSlickVersion = [1, 5, 2];", "const minimumSlickVersion = [1, 5, 3];")
replace_once("scripts/test-buffered-scaling-wiring.mjs", "older than required 1.5.2", "older than required 1.5.3")
replace_once("scripts/test-buffered-scaling-wiring.mjs", "older than required 1.5.2", "older than required 1.5.3")

# -----------------------------------------------------------------------------
# Remove obsolete input-mapping state from both Java and TypeScript.
# -----------------------------------------------------------------------------
for path in ["pwa/src/jackal/ButtonMapping.ts", "desktop/src/jackal/ButtonMapping.java"]:
    text = Path(path).read_text()
    patterns = [
        r"^\s*public (?:boolean|int) controller(?:\s*=\s*true)?;?\s*$\n?",
        r"^\s*public (?:boolean|int) controllerIndex(?:\s*=\s*0)?;?\s*$\n?",
        r"^\s*public (?:boolean|int) gunKeyMapped(?:\s*=\s*true)?;?\s*$\n?",
    ]
    if path.endswith(".ts"):
        patterns = [
            r"^\s*public controller: boolean = true;\s*$\n?",
            r"^\s*public controllerIndex: number = 0;\s*$\n?",
            r"^\s*public gunKeyMapped: boolean = true;\s*$\n?",
        ]
    for pattern in patterns:
        text = re.sub(pattern, "", text, flags=re.MULTILINE)
    for line in [
        "        this.controller = true;\n",
        "        this.controllerIndex = 0;\n",
        "        this.gunKeyMapped = true;\n",
        "    controller = true;\n",
        "    controllerIndex = 0;\n",
        "    gunKeyMapped = true;\n",
    ]:
        text = text.replace(line, "")
    Path(path).write_text(text)

replace_once("desktop/src/jackal/ButtonMapping.java", "private static final int VERSION = 1;", "private static final int VERSION = 2;")
for line in [
    '      mapping.controller = prefs.getBoolean("controller", true);\n',
    '      mapping.controllerIndex = prefs.getInt("controllerIndex", 0);\n',
    '      mapping.gunKeyMapped = prefs.getBoolean("gunKeyMapped", true);\n',
    '      prefs.putBoolean("controller", controller);\n',
    '      prefs.putInt("controllerIndex", controllerIndex);\n',
    '      prefs.putBoolean("gunKeyMapped", gunKeyMapped);\n',
]:
    remove_once("desktop/src/jackal/ButtonMapping.java", line)

# Java InputMode cleanup.
remove_once("desktop/src/jackal/InputMode.java", "  public static final int DEFAULT_CONTROLLER_INDEX = 0;\n")
replace_once(
    "desktop/src/jackal/InputMode.java",
    "  private void bindControllerDirection(int buttonIndex, int controllerIndex) {",
    "  private void bindControllerDirection(int buttonIndex) {",
)
replace_once(
    "desktop/src/jackal/InputMode.java",
    "    if (!bindDraftControllerButton(buttonIndex, controllerIndex)) {",
    "    if (!bindDraftControllerButton(buttonIndex)) {",
)
replace_once(
    "desktop/src/jackal/InputMode.java",
    "  private boolean bindDraftControllerButton(int buttonIndex,\n      int controllerIndex) {",
    "  private boolean bindDraftControllerButton(int buttonIndex) {",
)
for line in [
    "    draftButtonMapping.controller = true;\n",
    "    draftButtonMapping.controllerIndex = controllerIndex;\n",
    "        draftButtonMapping.gunKeyMapped = true;\n",
    "    copy.controller = source.controller;\n",
    "    copy.controllerIndex = source.controllerIndex;\n",
    "    copy.gunKeyMapped = source.gunKeyMapped;\n",
    "    buttonMapping.controller = draftButtonMapping.controller;\n",
    "    buttonMapping.controllerIndex = draftButtonMapping.controllerIndex;\n",
    "    buttonMapping.gunKeyMapped = draftButtonMapping.gunKeyMapped;\n",
]:
    remove_once("desktop/src/jackal/InputMode.java", line)
replace_once("desktop/src/jackal/InputMode.java", "      bindControllerDirection(direction, DEFAULT_CONTROLLER_INDEX);", "      bindControllerDirection(direction);")
replace_once(
    "desktop/src/jackal/InputMode.java",
    "      if (!bindDraftControllerButton(button, DEFAULT_CONTROLLER_INDEX)) {",
    "      if (!bindDraftControllerButton(button)) {",
)

# TypeScript InputMode cleanup.
for old, new in [
    ("    public controllerLeftPressed(controllerIndex: number): void {\n        this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_LEFT, controllerIndex);\n", "    public controllerLeftPressed(_controllerIndex: number): void {\n        this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_LEFT);\n"),
    ("    public controllerRightPressed(controllerIndex: number): void {\n        this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_RIGHT, controllerIndex);\n", "    public controllerRightPressed(_controllerIndex: number): void {\n        this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_RIGHT);\n"),
    ("    public controllerUpPressed(controllerIndex: number): void {\n        this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_UP, controllerIndex);\n", "    public controllerUpPressed(_controllerIndex: number): void {\n        this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_UP);\n"),
    ("    public controllerDownPressed(controllerIndex: number): void {\n        this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_DOWN, controllerIndex);\n", "    public controllerDownPressed(_controllerIndex: number): void {\n        this.bindControllerDirection(ButtonMapping.DEFAULT_CONTROLLER_DOWN);\n"),
    ("    public controllerButtonPressed(controllerIndex: number, buttonIndex: number): void {", "    public controllerButtonPressed(_controllerIndex: number, buttonIndex: number): void {"),
    ("    private bindControllerDirection(buttonIndex: number, controllerIndex: number): void {", "    private bindControllerDirection(buttonIndex: number): void {"),
    ("        if (!this.bindDraftControllerButton(buttonIndex, controllerIndex)) {", "        if (!this.bindDraftControllerButton(buttonIndex)) {"),
    ("    private bindDraftControllerButton(buttonIndex: number, controllerIndex: number): boolean {", "    private bindDraftControllerButton(buttonIndex: number): boolean {"),
    ("        if (!this.bindDraftControllerButton(buttonIndex, controllerIndex)) {", "        if (!this.bindDraftControllerButton(buttonIndex)) {"),
]:
    if old in Path("pwa/src/jackal/InputMode.ts").read_text():
        replace_once("pwa/src/jackal/InputMode.ts", old, new)
for line in [
    "        this.draftButtonMapping.controller = true;\n",
    "        this.draftButtonMapping.controllerIndex = controllerIndex;\n",
    "                this.draftButtonMapping.gunKeyMapped = true;\n",
    "        copy.controller = source.controller;\n",
    "        copy.controllerIndex = source.controllerIndex;\n",
    "        copy.gunKeyMapped = source.gunKeyMapped;\n",
    "        this.buttonMapping.controller = this.draftButtonMapping.controller;\n",
    "        this.buttonMapping.controllerIndex = this.draftButtonMapping.controllerIndex;\n",
    "        this.buttonMapping.gunKeyMapped = this.draftButtonMapping.gunKeyMapped;\n",
]:
    if line in Path("pwa/src/jackal/InputMode.ts").read_text():
        remove_once("pwa/src/jackal/InputMode.ts", line)

# Remove now-obsolete parity exception.
exceptions_path = Path("scripts/java-ts-parity-exceptions.json")
exceptions = json.loads(exceptions_path.read_text())
exceptions.get("fieldExceptions", {}).pop("InputMode.DEFAULT_CONTROLLER_INDEX", None)
exceptions_path.write_text(json.dumps(exceptions, indent=4) + "\n")

# Browser input mapping storage is current-only during development.
Path("pwa/src/app/JackalInputMappingStore.ts").write_text(
    '''import type { ButtonMapping } from "../jackal/ButtonMapping.js";
import { DeploymentStorageEntry } from "./DeploymentStorage.js";
const NO_BINDING = -1;

interface JackalInputMappingSnapshot {
    version: number;
    keyUp: number;
    keyDown: number;
    keyLeft: number;
    keyRight: number;
    keyGrenade: number;
    keyGun: number;
    keyStart: number;
    controllerUp: number;
    controllerDown: number;
    controllerLeft: number;
    controllerRight: number;
    controllerGrenade: number;
    controllerGun: number;
    controllerStart: number;
}

export class JackalInputMappingStore {
    private static readonly SNAPSHOT_VERSION = 2;
    private readonly storage = new DeploymentStorageEntry("jackal.input-mapping", "Jackal input mapping");

    public save(buttonMapping: ButtonMapping): boolean {
        try {
            return this.storage.write(
                JSON.stringify({
                    version: JackalInputMappingStore.SNAPSHOT_VERSION,
                    keyUp: buttonMapping.keyUp,
                    keyDown: buttonMapping.keyDown,
                    keyLeft: buttonMapping.keyLeft,
                    keyRight: buttonMapping.keyRight,
                    keyGrenade: buttonMapping.keyGrenade,
                    keyGun: buttonMapping.keyGun,
                    keyStart: buttonMapping.keyStart,
                    controllerUp: buttonMapping.controllerUp,
                    controllerDown: buttonMapping.controllerDown,
                    controllerLeft: buttonMapping.controllerLeft,
                    controllerRight: buttonMapping.controllerRight,
                    controllerGrenade: buttonMapping.controllerGrenade,
                    controllerGun: buttonMapping.controllerGun,
                    controllerStart: buttonMapping.controllerStart
                } satisfies JackalInputMappingSnapshot)
            );
        } catch (error) {
            console.warn("Unable to encode Jackal input mapping.", error);
            return false;
        }
    }

    public restore(buttonMapping: ButtonMapping): boolean {
        try {
            const snapshot = this.readSnapshot();
            if (snapshot === null) {
                return false;
            }
            buttonMapping.keyUp = snapshot.keyUp;
            buttonMapping.keyDown = snapshot.keyDown;
            buttonMapping.keyLeft = snapshot.keyLeft;
            buttonMapping.keyRight = snapshot.keyRight;
            buttonMapping.keyGrenade = snapshot.keyGrenade;
            buttonMapping.keyGun = snapshot.keyGun;
            buttonMapping.keyStart = snapshot.keyStart;
            buttonMapping.controllerUp = snapshot.controllerUp;
            buttonMapping.controllerDown = snapshot.controllerDown;
            buttonMapping.controllerLeft = snapshot.controllerLeft;
            buttonMapping.controllerRight = snapshot.controllerRight;
            buttonMapping.controllerGrenade = snapshot.controllerGrenade;
            buttonMapping.controllerGun = snapshot.controllerGun;
            buttonMapping.controllerStart = snapshot.controllerStart;
            return true;
        } catch (error) {
            console.warn("Unable to restore Jackal input mapping.", error);
            this.clear();
            return false;
        }
    }

    public clear(): boolean {
        return this.storage.remove();
    }

    private readSnapshot(): JackalInputMappingSnapshot | null {
        const stored = this.storage.read();
        if (!stored.available || stored.value === null) {
            return null;
        }

        const snapshot: unknown = JSON.parse(stored.value);
        if (!this.isSupportedSnapshot(snapshot)) {
            this.clear();
            return null;
        }

        return snapshot;
    }

    private isSupportedSnapshot(snapshot: unknown): snapshot is JackalInputMappingSnapshot {
        return (
            this.isRecord(snapshot) &&
            snapshot.version === JackalInputMappingStore.SNAPSHOT_VERSION &&
            this.isBinding(snapshot.keyUp) &&
            this.isBinding(snapshot.keyDown) &&
            this.isBinding(snapshot.keyLeft) &&
            this.isBinding(snapshot.keyRight) &&
            this.isBinding(snapshot.keyGrenade) &&
            this.isBinding(snapshot.keyGun) &&
            this.isBinding(snapshot.keyStart) &&
            this.isBinding(snapshot.controllerUp) &&
            this.isBinding(snapshot.controllerDown) &&
            this.isBinding(snapshot.controllerLeft) &&
            this.isBinding(snapshot.controllerRight) &&
            this.isBinding(snapshot.controllerGrenade) &&
            this.isBinding(snapshot.controllerGun) &&
            this.isBinding(snapshot.controllerStart)
        );
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    private isInteger(value: unknown): value is number {
        return typeof value === "number" && Number.isInteger(value) && value >= 0;
    }

    private isBinding(value: unknown): value is number {
        return value === NO_BINDING || this.isInteger(value);
    }
}
'''
)

Path("scripts/test-input-mapping-store.mjs").write_text(
    '''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const storage = new Map();

globalThis.localStorage = {
    getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
        storage.set(key, String(value));
    },
    removeItem(key) {
        storage.delete(key);
    }
};

function setLocation(href) {
    Object.defineProperty(globalThis, "location", { value: new URL(href), configurable: true, writable: true });
}

function compileModule(source) {
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}

async function loadStore() {
    const helperSource = readFileSync(new URL("../pwa/src/app/DeploymentStorageKeys.ts", import.meta.url), "utf8");
    const helperModuleUrl = compileModule(helperSource);
    const storageSource = readFileSync(new URL("../pwa/src/app/DeploymentStorage.ts", import.meta.url), "utf8").replace(
        `from "./DeploymentStorageKeys.js";`,
        `from "${helperModuleUrl}";`
    );
    const storageModuleUrl = compileModule(storageSource);
    const source = readFileSync(new URL("../pwa/src/app/JackalInputMappingStore.ts", import.meta.url), "utf8").replace(
        `from "./DeploymentStorage.js";`,
        `from "${storageModuleUrl}";`
    );
    return import(compileModule(source));
}

function storageKey(baseKey, href) {
    return `${baseKey}:${encodeURIComponent(new URL("./", href).pathname)}`;
}

function createMapping(overrides = {}) {
    return {
        keyUp: 200,
        keyDown: 208,
        keyLeft: 203,
        keyRight: 205,
        keyGrenade: 45,
        keyGun: 44,
        keyStart: 28,
        controllerUp: 12,
        controllerDown: 13,
        controllerLeft: 14,
        controllerRight: 15,
        controllerGrenade: 0,
        controllerGun: 2,
        controllerStart: 9,
        ...overrides
    };
}

test("input mappings with unbound controls survive save and restore", async () => {
    storage.clear();
    setLocation("https://example.test/stage/pwa/?v=old");
    const { JackalInputMappingStore } = await loadStore();
    const store = new JackalInputMappingStore();
    const saved = createMapping({ keyGun: -1, controllerLeft: -1, controllerGun: -1 });
    const restored = createMapping();

    assert.equal(store.save(saved), true);
    assert.equal(store.restore(restored), true);
    assert.deepEqual(restored, saved);
});

test("obsolete version-one mappings are discarded instead of migrated", async () => {
    storage.clear();
    const href = "https://example.test/stage/pwa/?v=old";
    setLocation(href);
    const { JackalInputMappingStore } = await loadStore();
    storage.set(storageKey("jackal.input-mapping", href), JSON.stringify({ version: 1, ...createMapping(), controller: true, controllerIndex: 0, gunKeyMapped: true }));

    assert.equal(new JackalInputMappingStore().restore(createMapping()), false);
    assert.equal(storage.has(storageKey("jackal.input-mapping", href)), false);
});

test("input mappings are isolated by deployment path and stable across cache-bust queries", async () => {
    storage.clear();
    const { JackalInputMappingStore } = await loadStore();
    const stageSaved = createMapping({ keyGun: -1, controllerGun: -1 });
    const productionSaved = createMapping({ keyGrenade: -1, controllerGrenade: -1 });

    setLocation("https://example.test/stage/pwa/?v=old");
    assert.equal(new JackalInputMappingStore().save(stageSaved), true);

    setLocation("https://example.test/production/pwa/?v=old");
    assert.equal(new JackalInputMappingStore().restore(createMapping()), false);
    assert.equal(new JackalInputMappingStore().save(productionSaved), true);

    const stageRestored = createMapping();
    setLocation("https://example.test/stage/pwa/?v=new");
    assert.equal(new JackalInputMappingStore().restore(stageRestored), true);
    assert.deepEqual(stageRestored, stageSaved);

    const productionRestored = createMapping();
    setLocation("https://example.test/production/pwa/?v=new");
    assert.equal(new JackalInputMappingStore().restore(productionRestored), true);
    assert.deepEqual(productionRestored, productionSaved);
});

test("corrupted staging mapping cleanup preserves production mapping", async () => {
    storage.clear();
    const { JackalInputMappingStore } = await loadStore();
    const stageHref = "https://example.test/stage/pwa/?v=old";
    const productionHref = "https://example.test/production/pwa/?v=old";
    const productionKey = storageKey("jackal.input-mapping", productionHref);

    setLocation(productionHref);
    assert.equal(new JackalInputMappingStore().save(createMapping({ keyGun: -1 })), true);

    storage.set(storageKey("jackal.input-mapping", stageHref), JSON.stringify({ version: 2, ...createMapping(), controllerGun: -2 }));

    setLocation(stageHref);
    assert.equal(new JackalInputMappingStore().restore(createMapping()), false);
    assert.equal(storage.has(storageKey("jackal.input-mapping", stageHref)), false);
    assert.equal(storage.has(productionKey), true);
});
'''
)

# Save-state format is current-only; bump because serialized ButtonMapping shape changed.
replace_once("pwa/src/jackal/persistence/GameStateSchema.ts", "GAME_STATE_VERSION = 7", "GAME_STATE_VERSION = 8")
for line in [
    '    "controller",\n',
    '    "controllerIndex",\n',
    '    "gunKeyMapped"\n',
]:
    remove_once("pwa/src/jackal/persistence/GameStateFields.ts", line)
# The previous line was the final item; ensure controllerStart now has no dangling comma issue after formatting.
replace_once("pwa/src/jackal/persistence/GameStateFields.ts", '    "controllerStart",\n);', '    "controllerStart"\n);')
for path in Path("scripts").glob("test-*.mjs"):
    text = path.read_text()
    text = text.replace(r"GAME_STATE_VERSION\s*=\s*7", r"GAME_STATE_VERSION\s*=\s*8")
    path.write_text(text)

# -----------------------------------------------------------------------------
# Stable content versions for static game resources.
# -----------------------------------------------------------------------------
Path("pwa/src/app/ResourceVersions.ts").write_text(
    '''declare const __RESOURCE_VERSIONS__: Readonly<Record<string, string>>;

/** Build-generated content fingerprints keyed by the original Java resource ref. */
export const RESOURCE_VERSIONS: Readonly<Record<string, string>> = __RESOURCE_VERSIONS__;
'''
)

Path("pwa/vite.config.ts").write_text(
    '''import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, resolve } from "node:path";
import { defineConfig } from "vite";
import type { Plugin, ResolvedConfig } from "vite";
import versionFileInfo from "../version.json";

const APP_VERSION_TOKEN = "__APP_VERSION__";
const BUILD_STAMP_TOKEN = "__BUILD_STAMP__";
const BASE_URL_TOKEN = "__BASE_URL__";
const RESOURCE_VERSIONS_TOKEN = "__RESOURCE_VERSIONS__";
const rootDir = fileURLToPath(new URL(".", import.meta.url));
const pwaOutDir = process.env.JACKAL_PWA_OUT_DIR ?? "../.release-components/pwa";
const buildVersionEnv = "JACKAL_BUILD_VERSION_JSON";
const resourceRoot = join(rootDir, "public", "resources");

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

function collectResourceVersions(dir: string, baseDir = dir): Record<string, string> {
    const rootStat = lstatSync(dir);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
        throw new Error(`PWA resource root must be a real directory: ${dir}`);
    }

    const versions: Record<string, string> = {};
    for (const entry of readdirSync(dir).sort((a, b) => a.localeCompare(b))) {
        const path = join(dir, entry);
        const stat = lstatSync(path);
        if (stat.isSymbolicLink()) {
            throw new Error(`PWA resource entry must not be a symlink or junction: ${path}`);
        }
        if (stat.isDirectory()) {
            Object.assign(versions, collectResourceVersions(path, baseDir));
            continue;
        }
        if (!stat.isFile()) {
            throw new Error(`PWA resource entry must be a regular file or directory: ${path}`);
        }
        const ref = relative(baseDir, path).replaceAll("\\\\", "/");
        versions[ref] = createHash("sha256").update(readFileSync(path)).digest("hex");
    }
    return versions;
}

const resourceVersions = collectResourceVersions(resourceRoot);

function applyBuildTokens(content: string, baseUrl: string): string {
    return content
        .replaceAll(APP_VERSION_TOKEN, versionInfo.version)
        .replaceAll(BUILD_STAMP_TOKEN, versionInfo.buildStamp)
        .replaceAll(BASE_URL_TOKEN, normalizeBaseUrl(baseUrl))
        .replaceAll(RESOURCE_VERSIONS_TOKEN, JSON.stringify(resourceVersions));
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

        const ref = relative(baseDir, path).replaceAll("\\\\", "/");
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
        __BUILD_STAMP__: JSON.stringify(versionInfo.buildStamp),
        __RESOURCE_VERSIONS__: JSON.stringify(resourceVersions)
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
'''
)

Path("pwa/public/sw.js").write_text(
    '''const APP_VERSION = "__APP_VERSION__";
const BUILD_STAMP = "__BUILD_STAMP__";
const RESOURCE_VERSIONS = __RESOURCE_VERSIONS__;
const SCOPE_CACHE_ID = encodeURIComponent(new URL(self.registration.scope).pathname);
const CACHE_PREFIX = `jackal|${SCOPE_CACHE_ID}|`;
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}-${BUILD_STAMP}`;
const APP_ROOT = appUrl("./");
const APP_INDEX = appUrl("index.html");
const RESOURCE_ROOT = new URL(appUrl("resources/"));
const APP_STATIC_RESOURCES = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./favicon.ico",
    "./resources/icons/32x32.png",
    "./resources/icons/192x192.png",
    "./resources/icons/512x512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(APP_STATIC_RESOURCES.map((url) => createCacheUrl(url)));
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
            await self.clients.claim();
        })()
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin || !requestUrl.href.startsWith(self.registration.scope)) {
        return;
    }
    if (event.request.mode === "navigate") {
        event.respondWith(networkFirstNavigation(event.request));
        return;
    }
    event.respondWith(cacheFirst(event.request));
});

async function networkFirstNavigation(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        return await fetchOnce(request);
    } catch (error) {
        const cached = (await cache.match(createCacheUrl(APP_INDEX))) || (await cache.match(createCacheUrl(APP_ROOT)));
        if (cached) {
            return cached;
        }
        throw error;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cacheUrl = createCacheUrl(request);
    const cached = await cache.match(cacheUrl);
    if (cached) {
        return cached;
    }

    return fetchOnce(request);
}

function appUrl(path) {
    return new URL(path, self.registration.scope).href;
}

function cacheVersionForUrl(url) {
    if (url.origin === RESOURCE_ROOT.origin && url.pathname.startsWith(RESOURCE_ROOT.pathname)) {
        const ref = decodeURIComponent(url.pathname.slice(RESOURCE_ROOT.pathname.length));
        const contentVersion = RESOURCE_VERSIONS[ref];
        if (typeof contentVersion === "string") {
            return contentVersion;
        }
    }
    return BUILD_STAMP;
}

function createCacheUrl(requestOrUrl) {
    const url = new URL(typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url, self.registration.scope);
    if (url.origin === self.location.origin && url.href.startsWith(self.registration.scope) && !url.searchParams.has("v")) {
        url.searchParams.set("v", cacheVersionForUrl(url));
    }
    url.hash = "";
    return url.href;
}

async function fetchOnce(request) {
    const response = await fetch(request);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response;
}
'''
)

# Runtime preloader: stable resource versions and bounded startup fan-out.
replace_once(
    "pwa/src/app/JackalRuntimeLoader.ts",
    'import { BUILD_STAMP } from "./BuildInfo.js";\n',
    'import { BUILD_STAMP } from "./BuildInfo.js";\nimport { RESOURCE_VERSIONS } from "./ResourceVersions.js";\n',
)
replace_once(
    "pwa/src/app/JackalRuntimeLoader.ts",
    "const RESOURCE_CACHE_RETRY_DELAY_MS = 250;\n",
    "const RESOURCE_CACHE_RETRY_DELAY_MS = 250;\nconst RESOURCE_PRELOAD_CONCURRENCY = 8;\nconst AUDIO_PRELOAD_CONCURRENCY = 3;\n",
)
replace_once(
    "pwa/src/app/JackalRuntimeLoader.ts",
    "                signal,\n                onProgress: (progress: ResourceLoadProgress) => {",
    "                signal,\n                concurrency: RESOURCE_PRELOAD_CONCURRENCY,\n                onProgress: (progress: ResourceLoadProgress) => {",
)
replace_once(
    "pwa/src/app/JackalRuntimeLoader.ts",
    "                signal,\n                onProgress: (progress: ResourceLoadProgress) => {\n                    loadedAudio = progress.loaded;",
    "                signal,\n                concurrency: AUDIO_PRELOAD_CONCURRENCY,\n                onProgress: (progress: ResourceLoadProgress) => {\n                    loadedAudio = progress.loaded;",
)
replace_once(
    "pwa/src/app/JackalRuntimeLoader.ts",
    "        ResourceLoader.setCacheBust(BUILD_STAMP);",
    "        ResourceLoader.setCacheVersionResolver((ref) => RESOURCE_VERSIONS[ref] ?? BUILD_STAMP);",
)

# Service worker registration already performs an update check; don't immediately repeat it.
Path("pwa/src/app/ServiceWorkerRegistrar.ts").write_text(
    '''export function registerServiceWorker(buildStamp: string): void {
    if (!("serviceWorker" in navigator)) {
        return;
    }
    if (import.meta.env.DEV) {
        void clearDevelopmentServiceWorkers().catch((error: unknown) => {
            console.warn("Unable to clear Jackal development service workers.", error);
        });
        return;
    }
    window.addEventListener("load", () => {
        const serviceWorkerUrl = new URL(`./sw.js?v=${encodeURIComponent(buildStamp)}`, window.location.href);
        void navigator.serviceWorker.register(serviceWorkerUrl, { scope: "./" }).catch((error: unknown) => {
            console.warn("Unable to register Jackal service worker.", error);
        });
    });
}

async function clearDevelopmentServiceWorkers(): Promise<void> {
    const appScope = new URL("./", window.location.href).href;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((registration) => registration.scope === appScope).map((registration) => registration.unregister()));
    if ("caches" in window) {
        const scopeCacheId = encodeURIComponent(new URL(appScope).pathname);
        const cachePrefix = `jackal|${scopeCacheId}|`;
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith(cachePrefix)).map((key) => caches.delete(key)));
    }
}
'''
)

# -----------------------------------------------------------------------------
# Reuse menu background preparation and surface persistence failures nonfatally.
# -----------------------------------------------------------------------------
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    "    private liveMenuOpen = false;\n    private volume = readVolume();",
    "    private liveMenuOpen = false;\n    private pendingPersistenceWarning: string | null = null;\n    private persistenceWarningTimer = 0;\n    private volume = readVolume();",
)
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    '                ${errorMessage ? `<p class="error-message">${escapeHtml(errorMessage)}</p>` : ""}\n',
    '                ${errorMessage ? `<p class="error-message">${escapeHtml(errorMessage)}</p>` : ""}\n                ${this.takePendingPersistenceWarningHtml()}\n',
)
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    "    private clearPwaStorage(): void {\n        clearPreferences();\n        clearStoredGameState();\n        this.inputMappingStore.clear();\n        this.gameStateStore = null;\n    }",
    '''    private clearPwaStorage(): void {
        const cleared = clearPreferences() && clearStoredGameState() && this.inputMappingStore.clear();
        this.gameStateStore = null;
        if (!cleared) {
            this.reportPersistenceFailure("Some saved Jackal settings could not be cleared.");
        }
    }''',
)
replace_once("pwa/src/app/JackalWebApp.ts", "        this.destroyGame();\n        const session = this.gameSessionGeneration;", "        this.destroyGameSession();\n        const session = this.gameSessionGeneration;")
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    '''    private clearStoredGameState(): void {
        clearStoredGameState();
        this.gameStateStore = null;
    }
''',
    '''    private clearStoredGameState(): void {
        if (!clearStoredGameState()) {
            this.reportPersistenceFailure("The previous saved game could not be cleared.");
        }
        this.gameStateStore = null;
    }
''',
)
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    '''    private saveCurrentGameState(): boolean {
        if (this.game === null || this.runtimeLoader.preparedRuntime === null) {
            return false;
        }
        if (!this.game.isStateSaveReady()) {
            return false;
        }
        return this.getGameStateStore(this.runtimeLoader.preparedRuntime).save(this.game);
    }
''',
    '''    private saveCurrentGameState(): boolean {
        if (this.game === null || this.runtimeLoader.preparedRuntime === null || !this.game.isStateSaveReady()) {
            return false;
        }
        const saved = this.getGameStateStore(this.runtimeLoader.preparedRuntime).save(this.game);
        if (!saved) {
            this.reportPersistenceFailure("Progress could not be saved. Your last successful save is unchanged.");
        }
        return saved;
    }
''',
)
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    '''    private saveCurrentInputMapping(): boolean {
        if (this.game === null) {
            return false;
        }
        return this.inputMappingStore.save(this.game.buttonMapping);
    }
''',
    '''    private saveCurrentInputMapping(): boolean {
        if (this.game === null) {
            return false;
        }
        const saved = this.inputMappingStore.save(this.game.buttonMapping);
        if (!saved) {
            this.reportPersistenceFailure("Control changes could not be saved.");
        }
        return saved;
    }
''',
)
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    '''    private destroyGame(): void {
        this.gameSessionGeneration++;
        this.runtimeLoader.cancelPreparation();
        this.removeMenuOverlay();
''',
    '''    private destroyGame(): void {
        this.runtimeLoader.cancelPreparation();
        this.destroyGameSession();
    }

    private destroyGameSession(): void {
        this.gameSessionGeneration++;
        this.removeMenuOverlay();
''',
)
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    "        this.game = null;\n        this.viewport.clear();",
    "        this.game = null;\n        this.clearPersistenceWarningToast();\n        this.viewport.clear();",
)
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    "        mainGame.clearInputPressedRecords();\n        this.syncCurrentGameLifecycleSuspension();",
    "        mainGame.clearInputPressedRecords();\n        this.syncCurrentGameLifecycleSuspension();\n        this.showPendingPersistenceWarning();",
)
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    "        this.game.setBrowserSuspended(false);\n        this.container?.setLoopSuspended(false);",
    "        this.game.setBrowserSuspended(false);\n        this.container?.setLoopSuspended(false);\n        this.showPendingPersistenceWarning();",
)
# Insert warning helpers immediately before resetLifecycleSuspension.
replace_once(
    "pwa/src/app/JackalWebApp.ts",
    '''    private resetLifecycleSuspension(): void {
        this.pageLifecycle.reset();
    }
''',
    '''    private reportPersistenceFailure(message: string): void {
        this.pendingPersistenceWarning = message;
        if (!this.pageLifecycle.suspended && !this.liveMenuOpen) {
            this.showPendingPersistenceWarning();
        }
    }

    private takePendingPersistenceWarningHtml(): string {
        const warning = this.pendingPersistenceWarning;
        this.pendingPersistenceWarning = null;
        return warning === null ? "" : `<p class="warning-message" role="status">${escapeHtml(warning)}</p>`;
    }

    private showPendingPersistenceWarning(): void {
        const warning = this.pendingPersistenceWarning;
        const shell = this.viewport.gameShell;
        if (warning === null || shell === null || this.liveMenuOpen) {
            return;
        }
        this.pendingPersistenceWarning = null;
        this.clearPersistenceWarningToast();
        const element = document.createElement("div");
        element.className = "persistence-warning";
        element.setAttribute("role", "status");
        element.textContent = warning;
        shell.appendChild(element);
        this.persistenceWarningTimer = window.setTimeout(() => {
            this.persistenceWarningTimer = 0;
            element.remove();
        }, 6000);
    }

    private clearPersistenceWarningToast(): void {
        if (this.persistenceWarningTimer !== 0) {
            clearTimeout(this.persistenceWarningTimer);
            this.persistenceWarningTimer = 0;
        }
        this.root.querySelector(".persistence-warning")?.remove();
    }

    private resetLifecycleSuspension(): void {
        this.pageLifecycle.reset();
    }
''',
)

# Styling for nonfatal persistence warnings.
replace_once(
    "pwa/src/styles.css",
    ".menu-buttons {\n",
    '''.warning-message {
    color: var(--title-cream);
    font-size: 14px;
    line-height: 1.45;
    margin: 0;
    max-width: 360px;
    text-align: center;
}

.persistence-warning {
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid var(--title-cream);
    border-radius: 8px;
    color: var(--plain-white);
    font-size: 14px;
    left: 50%;
    max-width: min(420px, calc(100% - 48px));
    padding: 10px 14px;
    position: absolute;
    text-align: center;
    top: 24px;
    transform: translateX(-50%);
    z-index: 40;
}

.menu-buttons {
''',
)

# -----------------------------------------------------------------------------
# Service-worker cache tests and release verification.
# -----------------------------------------------------------------------------
sw_test = Path("scripts/test-service-worker-versioned-cache-keys.mjs")
text = sw_test.read_text()
text = text.replace(
    '    buildStamp = "current",\n    cacheBackend = createCacheBackend(),',
    '    buildStamp = "current",\n    resourceVersions = {},\n    cacheBackend = createCacheBackend(),',
)
text = text.replace(
    '    const source = SERVICE_WORKER_SOURCE.replaceAll("__APP_VERSION__", appVersion).replaceAll("__BUILD_STAMP__", buildStamp);',
    '    const source = SERVICE_WORKER_SOURCE.replaceAll("__APP_VERSION__", appVersion).replaceAll("__BUILD_STAMP__", buildStamp).replaceAll("__RESOURCE_VERSIONS__", JSON.stringify(resourceVersions));',
)
insert_after = '''test("service worker cache keys add the current build stamp when v is absent", () => {
    const worker = loadServiceWorker({ buildStamp: "current" });

    assert.equal(worker.createCacheUrl("./resources/images/map.dat"), `${SCOPE}resources/images/map.dat?v=current`);
    assert.equal(worker.createCacheUrl("./resources/images/map.dat?palette=blue"), `${SCOPE}resources/images/map.dat?palette=blue&v=current`);
    assert.notEqual(worker.createCacheUrl("./resources/images/map.dat"), worker.createCacheUrl("./resources/images/map.dat?palette=blue"));
});
'''
content_test = '''
test("service worker cache keys use stable content versions for known game resources", () => {
    const worker = loadServiceWorker({
        buildStamp: "current",
        resourceVersions: { "images/map.dat": "content-map" }
    });

    assert.equal(worker.createCacheUrl("./resources/images/map.dat"), `${SCOPE}resources/images/map.dat?v=content-map`);
    assert.equal(worker.createCacheUrl("./resources/images/unknown.dat"), `${SCOPE}resources/images/unknown.dat?v=current`);
});
'''
if insert_after not in text:
    raise SystemExit("Unable to find service worker cache-key test insertion point")
text = text.replace(insert_after, insert_after + content_test, 1)
sw_test.write_text(text)

verify_path = Path("scripts/verify-pwa-precache.mjs")
text = verify_path.read_text()
text = text.replace('import { createServer } from "node:http";\n', 'import { createHash } from "node:crypto";\nimport { createServer } from "node:http";\n', 1)
parse_versions = '''
function parseResourceVersions(source) {
    const match = /const RESOURCE_VERSIONS = (\\{[\\s\\S]*?\\});/.exec(source);
    if (match === null) {
        throw new Error(`Unable to find RESOURCE_VERSIONS in ${pwaDistLabel}/sw.js.`);
    }
    const versions = JSON.parse(match[1]);
    if (versions === null || typeof versions !== "object" || Array.isArray(versions)) {
        throw new Error("RESOURCE_VERSIONS must be an object.");
    }
    return versions;
}

function collectExpectedResourceVersions(dir, baseDir = dir) {
    assertRealDirectory(dir, "PWA versioned resource directory");
    const versions = {};
    for (const entry of readdirSync(dir).sort((a, b) => a.localeCompare(b))) {
        const path = join(dir, entry);
        const stat = assertRealFileOrDirectory(path, "PWA versioned resource entry");
        if (stat.isDirectory()) {
            Object.assign(versions, collectExpectedResourceVersions(path, baseDir));
            continue;
        }
        const ref = relative(baseDir, path).replaceAll("\\\\", "/");
        versions[ref] = createHash("sha256").update(readFileSync(path)).digest("hex");
    }
    return versions;
}
'''
text = text.replace("function findDuplicates(values) {", parse_versions + "\nfunction findDuplicates(values) {", 1)
text = text.replace(
    'const listedResources = parseStaticResources(readFileSync(serviceWorkerPath, "utf8"));\n',
    'const serviceWorkerSource = readFileSync(serviceWorkerPath, "utf8");\nconst listedResources = parseStaticResources(serviceWorkerSource);\nconst resourceVersions = parseResourceVersions(serviceWorkerSource);\n',
    1,
)
text = text.replace(
    'const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));\n',
    'const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));\nconst expectedResourceVersions = collectExpectedResourceVersions(join(pwaDistDir, "resources"));\nassert.deepEqual(resourceVersions, expectedResourceVersions, "Built PWA resource fingerprints must exactly match emitted resource bytes.");\n',
    1,
)
# Add assert import because verifier now compares maps.
text = text.replace('import { createHash } from "node:crypto";\n', 'import assert from "node:assert/strict";\nimport { createHash } from "node:crypto";\n', 1)
verify_path.write_text(text)

# -----------------------------------------------------------------------------
# Real browser consumer smoke test using Jackal assets and buffered rendering.
# -----------------------------------------------------------------------------
Path("pwa/browser-verify.html").write_text(
    '''<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Jackal browser verification</title>
    </head>
    <body>
        <div id="game-host"></div>
        <pre id="result" data-status="pending">Browser verification is running.</pre>
        <script type="module" src="./src/browser-verify.ts"></script>
    </body>
</html>
'''
)

Path("pwa/src/browser-verify.ts").write_text(
    '''import { AppGameContainer, BasicGame, BufferedScalableGame, BufferedScalingMode, Display, ResourceLoader, XMLPackedSheet, type GameContainer, type Graphics, type Image } from "slick2d-ts";

const result = document.querySelector<HTMLElement>("#result");
const host = document.querySelector<HTMLElement>("#game-host");
if (result === null || host === null) {
    throw new Error("Browser verification fixture is missing required elements.");
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

class AtlasSmokeGame extends BasicGame {
    public rendered = false;

    public constructor(
        private readonly first: Image,
        private readonly second: Image,
        private readonly flipped: Image
    ) {
        super("Jackal browser verification");
    }

    public init(_gc: GameContainer): void {}

    public update(_gc: GameContainer, _delta: number): void {}

    public render(_gc: GameContainer, g: Graphics): void {
        g.drawImage(this.first, 32, 32);
        g.drawImage(this.second, 128, 32);
        g.drawImage(this.flipped, 224, 32);
        this.rendered = true;
    }
}

async function waitForRender(game: AtlasSmokeGame): Promise<void> {
    const deadline = performance.now() + 5000;
    while (!game.rendered && performance.now() < deadline) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    assert(game.rendered, "Buffered Jackal fixture did not render a browser frame.");
}

async function verify(): Promise<void> {
    ResourceLoader.clearCache();
    ResourceLoader.removeAllResourceLocations();
    ResourceLoader.addResourceLocation(new URL("./resources/", window.location.href));
    ResourceLoader.setCacheBust(null);
    await ResourceLoader.preloadResources(["images/sprites-1.png", "images/sprites-1.xml"], { concurrency: 2 });

    const pack = new XMLPackedSheet("images/sprites-1.png", "images/sprites-1.xml");
    const first = pack.getSprite("player-green-0.png");
    const second = pack.getSprite("explosion-0.png");
    assert(first !== null && second !== null, "Expected Jackal atlas sprites are missing.");
    const flipped = first.getFlippedCopy(true, false);

    await ResourceLoader.waitForAll();

    const firstTextureWidth = first.getTextureWidth();
    const firstTextureHeight = first.getTextureHeight();
    assert(Math.abs(firstTextureWidth) > 0 && Math.abs(firstTextureWidth) < 1, "Atlas child unexpectedly spans the full texture width.");
    assert(Math.abs(firstTextureHeight) > 0 && Math.abs(firstTextureHeight) < 1, "Atlas child unexpectedly spans the full texture height.");
    assert(
        first.getTextureOffsetX() !== second.getTextureOffsetX() || first.getTextureOffsetY() !== second.getTextureOffsetY(),
        "Distinct Jackal atlas children resolved to the same source origin."
    );
    assert(Math.abs(flipped.getTextureWidth() + firstTextureWidth) < 1e-12, "Flipped atlas child did not reverse its texture-width sign.");

    Display.setParent(host);
    const game = new AtlasSmokeGame(first, second, flipped);
    const buffered = new BufferedScalableGame(game, 320, 240, { maintainAspect: true, scalingMode: BufferedScalingMode.Nearest });
    const container = new AppGameContainer(buffered, 640, 480, false);
    container.setLoopSuspended(false);
    try {
        await container.start();
        await waitForRender(game);
        buffered.setScalingMode(BufferedScalingMode.Linear);
        buffered.setScalingMode(BufferedScalingMode.Integer);
    } finally {
        container.destroy();
        Display.setParent(null);
    }
}

void verify().then(
    () => {
        result.dataset.status = "passed";
        result.textContent = "Jackal browser verification passed.";
    },
    (error: unknown) => {
        console.error(error);
        result.dataset.status = "failed";
        result.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
    }
);
'''
)

Path("scripts/run-browser-verification.mjs").write_text(
    '''import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { rootDir } from "./build-utils.mjs";

const port = 5197;
const url = `http://127.0.0.1:${port}/browser-verify.html`;
const candidates = [
    process.env.CHROMIUM_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
].filter(Boolean);

async function findBrowser() {
    for (const candidate of candidates) {
        try {
            await access(candidate);
            return candidate;
        } catch {
            // Try the next known browser location.
        }
    }
    throw new Error("Chromium was not found. Set CHROMIUM_PATH to a Chrome or Chromium executable.");
}

async function waitForServer(child) {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            throw new Error(`Vite browser-verification server exited with code ${child.exitCode}.`);
        }
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
            if (response.ok) {
                return;
            }
        } catch {
            // Vite may not be listening yet.
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
    throw new Error("Vite browser-verification server did not start within 20 seconds.");
}

function collect(child) {
    return new Promise((resolveResult, rejectResult) => {
        let stdout = "";
        let stderr = "";
        child.stdout?.on("data", (chunk) => (stdout += String(chunk)));
        child.stderr?.on("data", (chunk) => (stderr += String(chunk)));
        child.once("error", rejectResult);
        child.once("exit", (code, signal) => resolveResult({ code, signal, stdout, stderr }));
    });
}

async function stop(child) {
    if (child.exitCode !== null) {
        return;
    }
    child.kill("SIGTERM");
    await Promise.race([collect(child), new Promise((resolveDelay) => setTimeout(resolveDelay, 3000))]);
    if (child.exitCode === null) {
        child.kill("SIGKILL");
    }
}

const viteBin = resolve(rootDir, "node_modules", "vite", "bin", "vite.js");
const server = spawn(process.execPath, [viteBin, "--config", "pwa/vite.config.ts", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"]
});

try {
    await waitForServer(server);
    const browser = await findBrowser();
    const chrome = spawn(
        browser,
        ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu-sandbox", "--virtual-time-budget=15000", "--dump-dom", url],
        { cwd: rootDir, stdio: ["ignore", "pipe", "pipe"] }
    );
    const result = await collect(chrome);
    if (result.code !== 0) {
        throw new Error(`Chromium browser verification failed (code=${result.code}, signal=${result.signal}).\n${result.stderr}`);
    }
    if (!/data-status=["']passed["']/.test(result.stdout)) {
        throw new Error(`Jackal browser verification did not pass.\n${result.stdout}\n${result.stderr}`);
    }
    console.log("Jackal real-browser atlas and buffered-scaling verification passed.");
} finally {
    await stop(server);
}
'''
)

# -----------------------------------------------------------------------------
# Actual Java-vs-TypeScript Player state traces.
# -----------------------------------------------------------------------------
Path("scripts/test-java-ts-player-differential.mjs").write_text(
    '''import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

function toolAvailable(command, args) {
    return spawnSync(command, args, { encoding: "utf8" }).status === 0;
}

function write(path, text) {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, text, "utf8");
}

function javaSources(workDir) {
    const sourceRoot = join(workDir, "src", "jackal");
    const classRoot = join(workDir, "classes");
    mkdirSync(sourceRoot, { recursive: true });
    mkdirSync(classRoot, { recursive: true });
    copyFileSync(join(rootDir, "desktop", "src", "jackal", "Player.java"), join(sourceRoot, "Player.java"));

    write(join(sourceRoot, "IInput.java"), `package jackal; public interface IInput { boolean isUp(); boolean isDown(); boolean isLeft(); boolean isRight(); boolean isFire(); boolean isShoot(); }`);
    write(join(sourceRoot, "Enemy.java"), `package jackal; public class Enemy { public boolean bump(float a,float b,float c,float d,boolean invincible){return false;} }`);
    write(join(sourceRoot, "FriendlySoldierType.java"), `package jackal; public enum FriendlySoldierType { WEAPON_CARRIER_WANDERER, WANDERER }`);
    write(join(sourceRoot, "FriendlySoldier.java"), `package jackal; public class FriendlySoldier { public static int count; public static void resetCount(){count=0;} public FriendlySoldier(float x,float y,FriendlySoldierType type){count++;} }`);
    write(join(sourceRoot, "Explosion.java"), `package jackal; public class Explosion { public Explosion(float x,float y,boolean player){} }`);
    write(join(sourceRoot, "Grenade.java"), `package jackal; public class Grenade { public static int count; public Grenade(float x,float y,int angle){count++;} }`);
    write(join(sourceRoot, "PlayerMissile.java"), `package jackal; public class PlayerMissile { public static int count; public PlayerMissile(float x,float y,int angle,int power){count++;} }`);
    write(join(sourceRoot, "PlayerBullet.java"), `package jackal; public class PlayerBullet { public static int count; public PlayerBullet(float x,float y){count++;} }`);
    write(join(sourceRoot, "Modes.java"), `package jackal; public enum Modes { CONTINUE }`);
    write(join(sourceRoot, "KonamiCode.java"), `package jackal; public class KonamiCode { public boolean enabled; }`);
    write(join(sourceRoot, "InputStub.java"), `package jackal; public class InputStub implements IInput { public boolean up,down,left,right,fire,shoot; public boolean isUp(){return up;} public boolean isDown(){return down;} public boolean isLeft(){return left;} public boolean isRight(){return right;} public boolean isFire(){return fire;} public boolean isShoot(){return shoot;} }`);
    write(
        join(sourceRoot, "GameMode.java"),
        `package jackal; import java.util.ArrayList; public class GameMode { public static final int TYPE_EMPTY=1,TYPE_SWAMP=4,TYPE_CONVEYOR=5; public ArrayList<Enemy> mines=new ArrayList<Enemy>(); public boolean stageCompleted,bossCameraPan,endingCameraPan,playing=true,paused; public float maxCameraY=4096, conveyorDelta=1; public Object gc; public int tileType=TYPE_EMPTY; public int getTileType(float x,float y){return tileType;} public boolean isDriveable(float x,float y){return true;} }`
    );
    write(
        join(sourceRoot, "Main.java"),
        `package jackal; import java.awt.geom.Point2D; import java.util.Random; public class Main { public static Main main; public static GameMode gameMode; public IInput input; public boolean hasMissiles; public int missilePower,extraLives=4; public KonamiCode konamiCode=new KonamiCode(); public Random random=new Random(1); public Object pickupSound=new Object(),weaponUpgradeSound=new Object(),playerExplodeSound=new Object(); public Object[] playerWakes=new Object[6]; public Object[][] players=new Object[4][5]; public void upgradeWeapon(boolean always){} public void playSound(Object s){} public void stopSong(){} public void requestMode(Modes mode,Object gc){} public void loseLife(){extraLives--;} public void draw(Object image,float x,float y,float alpha){} public void drawRotatedAlpha(Object image,float x,float y,float angle,float alpha){} public void drawVehicle(Object[] images,float x,float y,float angle){} public static Point2D.Float rotate(float x,float y,float angle){float cos=(float)Math.cos(angle);float sin=(float)Math.sin(angle);return new Point2D.Float(x*cos-y*sin,x*sin+y*cos);} }`
    );
    write(
        join(sourceRoot, "PlayerHarness.java"),
        `package jackal; public final class PlayerHarness { static String bits(float v){return Integer.toUnsignedString(Float.floatToIntBits(v));} static void row(String s,int t,Player p){System.out.println(s+"|"+t+"|"+bits(p.x)+"|"+bits(p.y)+"|"+p.angle+"|"+p.nextAngle+"|"+bits(p.displayAngle)+"|"+bits(p.angleVelocity)+"|"+p.angleSteps+"|"+p.diagonalDelay+"|"+p.fireAngle+"|"+p.inSwamp+"|"+Grenade.count+"|"+PlayerMissile.count+"|"+PlayerBullet.count+"|"+p.gunArmed); } static Player reset(InputStub in,GameMode mode){Main.main=new Main();Main.gameMode=mode;Main.main.input=in;Grenade.count=PlayerMissile.count=PlayerBullet.count=0;return new Player();} static void run(String name,InputStub in,GameMode mode,int ticks){Player p=reset(in,mode);row(name,0,p);for(int t=1;t<=ticks;t++){p.update();row(name,t,p);}} public static void main(String[] args){InputStub in=new InputStub();GameMode mode=new GameMode();in.right=true;run("R",in,mode,20);in=new InputStub();mode=new GameMode();in.down=true;in.right=true;run("D",in,mode,12);in=new InputStub();mode=new GameMode();mode.tileType=GameMode.TYPE_SWAMP;in.right=true;run("S",in,mode,10);in=new InputStub();mode=new GameMode();mode.tileType=GameMode.TYPE_CONVEYOR;run("C",in,mode,5);in=new InputStub();mode=new GameMode();Player p=reset(in,mode);p.update();in.fire=true;row("F",0,p);p.update();row("F",1,p);in.fire=false;p.update();row("F",2,p);in=new InputStub();mode=new GameMode();p=reset(in,mode);p.update();in.shoot=true;row("G",0,p);for(int t=1;t<=50;t++){p.update();row("G",t,p);} } }`
    );
    return { sourceRoot, classRoot };
}

function runJava(workDir) {
    const { sourceRoot, classRoot } = javaSources(workDir);
    const files = ["IInput", "Enemy", "FriendlySoldierType", "FriendlySoldier", "Explosion", "Grenade", "PlayerMissile", "PlayerBullet", "Modes", "KonamiCode", "InputStub", "GameMode", "Main", "Player", "PlayerHarness"].map((name) => join(sourceRoot, `${name}.java`));
    const compile = spawnSync("javac", ["-encoding", "UTF-8", "-d", classRoot, ...files], { encoding: "utf8" });
    assert.equal(compile.status, 0, `javac failed:\n${compile.stdout}\n${compile.stderr}`);
    const run = spawnSync("java", ["-cp", classRoot, "jackal.PlayerHarness"], { encoding: "utf8" });
    assert.equal(run.status, 0, `Java Player harness failed:\n${run.stdout}\n${run.stderr}`);
    return run.stdout.trim().split(/\\r?\\n/).filter(Boolean);
}

function stripImports(source) {
    return source.replace(/^import[\\s\\S]*?;\\s*$/gm, "");
}

async function runTypeScript() {
    const stubs = `
const javaFloat=Math.fround; const javaInt=(v)=>v<0?Math.ceil(v):Math.floor(v); const javaArray=(n,v)=>Array.from({length:n},()=>v);
class ArrayList { constructor(){this.values=[];} add(v){this.values.push(v);return true;} get(i){return this.values[i];} size(){return this.values.length;} }
class Point2D { static Float=class { constructor(x,y){this.x=x;this.y=y;} }; }
function rotatePointLikeJava(x,y,angle){x=javaFloat(x);y=javaFloat(y);angle=javaFloat(angle);const cos=javaFloat(Math.cos(angle)),sin=javaFloat(Math.sin(angle));return new Point2D.Float(javaFloat(javaFloat(x*cos)-javaFloat(y*sin)),javaFloat(javaFloat(x*sin)+javaFloat(y*cos)));}
const TILE_TYPE_EMPTY=1,TILE_TYPE_SWAMP=4,TILE_TYPE_CONVEYOR=5; const PLAYER_SPEED=2.5,PLAYER_ANGLE_STEPS=8,PLAYER_ANGLE_VELOCITY=Math.fround(45/8),PLAYER_RUMBLE=Array(17).fill(0);
let runtimeMain=null,runtimeMode=null; const requireMainRuntime=()=>runtimeMain; const requireMainRuntimeGameMode=()=>runtimeMode;
class FriendlySoldierType { static WEAPON_CARRIER_WANDERER=0; static WANDERER=1; }
class FriendlySoldier { static count=0; static resetCount(){this.count=0;} static wandering(){this.count++; return new FriendlySoldier();} }
class Explosion { static withPlayerExplosion(){return new Explosion();} }
class Grenade { static count=0; constructor(){Grenade.count++;} }
class PlayerMissile { static count=0; constructor(){PlayerMissile.count++;} }
class PlayerBullet { static count=0; constructor(){PlayerBullet.count++;} }
class Modes { static CONTINUE=0; }
`;
    const source = stripImports(readFileSync(join(rootDir, "pwa", "src", "jackal", "Player.ts"), "utf8"));
    let output = ts.transpileModule(stubs, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: false } }).outputText;
    output += ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, useDefineForClassFields: false }, fileName: "Player.ts" }).outputText;
    output += `
function bits(v){const b=new ArrayBuffer(4),d=new DataView(b);d.setFloat32(0,v,false);return String(d.getUint32(0,false));}
function row(s,t,p){return s+"|"+t+"|"+bits(p.x)+"|"+bits(p.y)+"|"+p.angle+"|"+p.nextAngle+"|"+bits(p.displayAngle)+"|"+bits(p.angleVelocity)+"|"+p.angleSteps+"|"+p.diagonalDelay+"|"+p.fireAngle+"|"+p.inSwamp+"|"+Grenade.count+"|"+PlayerMissile.count+"|"+PlayerBullet.count+"|"+p.gunArmed;}
class InputStub {up=false;down=false;left=false;right=false;fire=false;shoot=false;isUp(){return this.up;}isDown(){return this.down;}isLeft(){return this.left;}isRight(){return this.right;}isFire(){return this.fire;}isShoot(){return this.shoot;}}
class ModeStub {constructor(){this.mines=new ArrayList();this.stageCompletedFlag=false;this.bossCameraPan=false;this.endingCameraPan=false;this.playing=true;this.paused=false;this.maxCameraY=4096;this.conveyorDelta=1;this.tileType=TILE_TYPE_EMPTY;this.gc={};}getTileType(){return this.tileType;}isDriveable(){return true;}}
function reset(input,mode){runtimeMode=mode;runtimeMain={input,hasMissiles:false,missilePower:0,extraLives:4,konamiCode:{enabled:false},random:{nextInt(){return 0;}},pickupSound:{},weaponUpgradeSound:{},playerExplodeSound:{},playerWakes:Array(6),players:Array.from({length:4},()=>Array(5)),upgradeWeapon(){},playSound(){},stopAllSongs(){},requestMode(){},loseLife(){this.extraLives--;},drawImageAlpha(){},drawRotatedAlpha(){},drawVehicle(){}};Grenade.count=PlayerMissile.count=PlayerBullet.count=0;return new Player();}
function runScenario(name,input,mode,ticks,rows){const p=reset(input,mode);rows.push(row(name,0,p));for(let t=1;t<=ticks;t++){p.update();rows.push(row(name,t,p));}}
const rows=[];let i=new InputStub(),m=new ModeStub();i.right=true;runScenario("R",i,m,20,rows);i=new InputStub();m=new ModeStub();i.down=i.right=true;runScenario("D",i,m,12,rows);i=new InputStub();m=new ModeStub();m.tileType=TILE_TYPE_SWAMP;i.right=true;runScenario("S",i,m,10,rows);i=new InputStub();m=new ModeStub();m.tileType=TILE_TYPE_CONVEYOR;runScenario("C",i,m,5,rows);i=new InputStub();m=new ModeStub();let p=reset(i,m);p.update();i.fire=true;rows.push(row("F",0,p));p.update();rows.push(row("F",1,p));i.fire=false;p.update();rows.push(row("F",2,p));i=new InputStub();m=new ModeStub();p=reset(i,m);p.update();i.shoot=true;rows.push(row("G",0,p));for(let t=1;t<=50;t++){p.update();rows.push(row("G",t,p));} export { rows };`;
    return (await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`)).rows;
}

test("actual Java and TypeScript Player mechanics stay synchronized", async (t) => {
    if (!toolAvailable("javac", ["-version"]) || !toolAvailable("java", ["-version"])) {
        t.skip("A JDK is not available; Java/TypeScript Player differential test skipped.");
        return;
    }
    const workDir = mkdtempSync(join(tmpdir(), "jackal-player-"));
    try {
        assert.deepEqual(await runTypeScript(), runJava(workDir));
    } finally {
        rmSync(workDir, { recursive: true, force: true });
    }
});
'''
)

# Guard against regressing preload reuse and fossilized mapping state.
Path("scripts/test-pwa-maintenance-guardrails.mjs").write_text(
    '''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";
import { join } from "node:path";

const read = (path) => readFileSync(join(rootDir, path), "utf8");

test("starting a game reuses any menu background preparation", () => {
    const source = read("pwa/src/app/JackalWebApp.ts");
    assert.match(source, /private async startGame[\\s\\S]*?this\\.destroyGameSession\\(\\);/);
    assert.match(source, /private destroyGame\\(\\): void \\{\\s*this\\.runtimeLoader\\.cancelPreparation\\(\\);\\s*this\\.destroyGameSession\\(\\);/);
    assert.doesNotMatch(source, /private async startGame[\\s\\S]{0,300}?this\\.runtimeLoader\\.cancelPreparation/);
});

test("obsolete controller selection flags do not survive in shared mappings", () => {
    const sources = [
        read("pwa/src/jackal/ButtonMapping.ts"),
        read("desktop/src/jackal/ButtonMapping.java"),
        read("pwa/src/app/JackalInputMappingStore.ts"),
        read("pwa/src/jackal/persistence/GameStateFields.ts")
    ].join("\\n");
    assert.doesNotMatch(sources, /\\bcontrollerIndex\\b|\\bgunKeyMapped\\b/);
    assert.doesNotMatch(read("pwa/src/jackal/ButtonMapping.ts"), /public controller:/);
    assert.doesNotMatch(read("desktop/src/jackal/ButtonMapping.java"), /public boolean controller;/);
});

test("PWA resources use generated content identities and bounded preload concurrency", () => {
    const loader = read("pwa/src/app/JackalRuntimeLoader.ts");
    const vite = read("pwa/vite.config.ts");
    assert.match(loader, /setCacheVersionResolver/);
    assert.match(loader, /RESOURCE_PRELOAD_CONCURRENCY = 8/);
    assert.match(loader, /AUDIO_PRELOAD_CONCURRENCY = 3/);
    assert.match(vite, /createHash\\("sha256"\\)/);
    assert.match(vite, /__RESOURCE_VERSIONS__/);
});

test("service worker registration does not immediately issue a redundant update check", () => {
    const source = read("pwa/src/app/ServiceWorkerRegistrar.ts");
    assert.match(source, /navigator\\.serviceWorker\\.register/);
    assert.doesNotMatch(source, /registration\\.update\\(\\)/);
});
'''
)

# CI: cancel superseded runs and execute the real-browser consumer check.
Path(".github/workflows/verify.yml").write_text(
    '''name: Verify

on:
    push:
    pull_request:
    workflow_dispatch:

concurrency:
    group: verify-${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true

jobs:
    verify:
        runs-on: ubuntu-latest

        steps:
            - name: Checkout
              uses: actions/checkout@v7

            - name: Set up Node
              uses: actions/setup-node@v7
              with:
                  node-version: 22.13.0
                  cache: npm

            - name: Set up Java
              uses: actions/setup-java@v6
              with:
                  distribution: temurin
                  java-version: "21"
                  cache: maven

            - name: Install dependencies
              run: npm ci

            - name: Build
              run: npm run build

            - name: Verify real browser
              run: npm run verify:browser
'''
)
