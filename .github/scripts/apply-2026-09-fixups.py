from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


def replace_count(path: str, old: str, new: str, expected: int) -> None:
    text = read(path)
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"Expected {expected} matches in {path}, found {count}: {old[:120]!r}")
    write(path, text.replace(old, new))


# Finish removing obsolete controller-selection state from the CRLF Java source.
java_mapping = Path("desktop/src/jackal/ButtonMapping.java")
with java_mapping.open("r", encoding="utf-8", newline="") as stream:
    java_text = stream.read()
java_text, removed = re.subn(
    r"^[ \t]*(?:controller = true;|controllerIndex = 0;|gunKeyMapped = true;)\r?\n",
    "",
    java_text,
    flags=re.MULTILINE,
)
if removed != 3:
    raise SystemExit(f"Expected to remove three obsolete Java reset assignments, removed {removed}.")
with java_mapping.open("w", encoding="utf-8", newline="") as stream:
    stream.write(java_text)


# The reset wiring is intentionally centralized in clearPwaStorage().
replace_once(
    "scripts/test-buffered-scaling-wiring.mjs",
    '''    assert.match(webAppSource, /clearPreferences\\(\\);/);\n    assert.match(webAppSource, /clearStoredGameState\\(\\);/);\n    assert.match(webAppSource, /this\\.inputMappingStore\\.clear\\(\\);/);\n''',
    '''    assert.match(webAppSource, /const cleared = clearPreferences\\(\\) && clearStoredGameState\\(\\) && this\\.inputMappingStore\\.clear\\(\\);/);\n''',
)


# Save-state tests follow the schema source instead of repeating the current number.
replace_once(
    "scripts/test-game-state-current-version.mjs",
    '''test("save-state validator accepts only the current schema", async () => {\n    const { fields, validator } = await loadPersistenceValidation();\n    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, 6)), false);\n    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, 7)), true);\n    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, 8)), false);\n\n    const invalidSeed = modeSnapshot(fields, 7);\n''',
    '''test("save-state validator accepts only the current schema", async () => {\n    const { schema, fields, validator } = await loadPersistenceValidation();\n    const currentVersion = schema.GAME_STATE_VERSION;\n    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, currentVersion - 1)), false);\n    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, currentVersion)), true);\n    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, currentVersion + 1)), false);\n\n    const invalidSeed = modeSnapshot(fields, currentVersion);\n''',
)
replace_once(
    "scripts/test-game-state-current-version.mjs",
    '''test("current entity runtime descriptors are required and exact", async () => {\n    const { fields, validator } = await loadPersistenceValidation();\n    const enemyBullet = { id: 0, type: "EnemyBullet", fields: {}, runtimeFields: { enemyBulletSprite: "yellow" } };\n    assert.equal(validator.isSupportedGameStateSnapshot(gameSnapshot(fields, 7, enemyBullet)), true);\n    assert.equal(validator.isSupportedGameStateSnapshot(gameSnapshot(fields, 7, { id: 0, type: "EnemyBullet", fields: {}, runtimeFields: null })), false);\n''',
    '''test("current entity runtime descriptors are required and exact", async () => {\n    const { schema, fields, validator } = await loadPersistenceValidation();\n    const currentVersion = schema.GAME_STATE_VERSION;\n    const enemyBullet = { id: 0, type: "EnemyBullet", fields: {}, runtimeFields: { enemyBulletSprite: "yellow" } };\n    assert.equal(validator.isSupportedGameStateSnapshot(gameSnapshot(fields, currentVersion, enemyBullet)), true);\n    assert.equal(validator.isSupportedGameStateSnapshot(gameSnapshot(fields, currentVersion, { id: 0, type: "EnemyBullet", fields: {}, runtimeFields: null })), false);\n''',
)
replace_count("scripts/test-game-state-current-version.mjs", "gameSnapshot(fields, 7, {", "gameSnapshot(fields, currentVersion, {", 2)

save_test = "scripts/test-game-state-save-preservation.mjs"
replace_once(
    save_test,
    'let throwOnGet = false;\n',
    '''let throwOnGet = false;\nconst gameStateSchemaSource = readFileSync(new URL("../pwa/src/jackal/persistence/GameStateSchema.ts", import.meta.url), "utf8");\nconst currentGameStateVersion = Number(/GAME_STATE_VERSION\\s*=\\s*(\\d+)/.exec(gameStateSchemaSource)?.[1]);\nif (!Number.isInteger(currentGameStateVersion)) {\n    throw new Error("Unable to determine the current Jackal game-state schema version.");\n}\n''',
)
replace_once(
    save_test,
    '    const schemaUrl = compileModule(readFileSync(new URL("../pwa/src/jackal/persistence/GameStateSchema.ts", import.meta.url), "utf8"));',
    '    const schemaUrl = compileModule(gameStateSchemaSource);',
)
replace_once(save_test, 'snapshot.version === 7 && snapshot.supported === true', 'snapshot.version === ${currentGameStateVersion} && snapshot.supported === true')
replace_once(save_test, 'return { version: 7, kind: "mode", supported: true, appVersion, marker: main.marker ?? "saved" };', 'return { version: ${currentGameStateVersion}, kind: "mode", supported: true, appVersion, marker: main.marker ?? "saved" };')
replace_once(save_test, 'storage.set(key, JSON.stringify({ version: 7, kind: "mode", supported: true, marker: "keep", throwOnRestore: true }));', 'storage.set(key, JSON.stringify({ version: currentGameStateVersion, kind: "mode", supported: true, marker: "keep", throwOnRestore: true }));')
replace_count(save_test, 'storage.set(key, JSON.stringify({ version: 8, kind:', 'storage.set(key, JSON.stringify({ version: currentGameStateVersion + 1, kind:', 2)
replace_once(save_test, 'storage.set(key, JSON.stringify({ version: 7, kind: "game", supported: false }));', 'storage.set(key, JSON.stringify({ version: currentGameStateVersion - 1, kind: "game", supported: false }));')
replace_once(save_test, 'storage.set(key, JSON.stringify({ version: 7, kind: "mode", supported: true }));', 'storage.set(key, JSON.stringify({ version: currentGameStateVersion, kind: "mode", supported: true }));')

replace_once(
    "scripts/test-game-state-schema-single-source.mjs",
    '    assert.match(schemaSource, /export const GAME_STATE_VERSION = 7 as const/);',
    '    assert.match(schemaSource, /export const GAME_STATE_VERSION = \\d+ as const/);',
)
replace_once(
    "scripts/test-typescript-tech-debt-guardrails.mjs",
    '    assert.match(schema, /GAME_STATE_VERSION\\s*=\\s*7/);',
    '    assert.match(schema, /GAME_STATE_VERSION\\s*=\\s*\\d+/);',
)
replace_once(
    "scripts/test-typescript-tech-debt-guardrails.mjs",
    '        "PageLifecycleMonitor.js",\n        "ScalingPicker.js"',
    '        "PageLifecycleMonitor.js",\n        "PersistenceWarningController.js",\n        "ScalingPicker.js"',
)


# Release-stamping tests understand content-level resource versions.
replace_once(
    "scripts/test-release-stamping.mjs",
    '    const source = header.replaceAll("__APP_VERSION__", versionJson.version).replaceAll("__BUILD_STAMP__", buildStamp);',
    '    const source = header.replaceAll("__APP_VERSION__", versionJson.version).replaceAll("__BUILD_STAMP__", buildStamp).replaceAll("__RESOURCE_VERSIONS__", "{}");',
)
replace_once(
    "scripts/test-release-stamping.mjs",
    '    assert.match(runtimeLoaderSource, /ResourceLoader\\.setCacheBust\\(BUILD_STAMP\\)/);',
    '    assert.match(runtimeLoaderSource, /ResourceLoader\\.setCacheVersionResolver\\(/);',
)


# The generated browser runner imports only what it uses.
replace_once("scripts/run-browser-verification.mjs", 'import { join, resolve } from "node:path";', 'import { resolve } from "node:path";')


# Keep JackalWebApp focused by moving warning presentation into its own PWA helper.
Path("pwa/src/app/PersistenceWarningController.ts").write_text(
    '''import { escapeHtml } from "./JackalScreens.js";\n\nexport class PersistenceWarningController {\n    private pendingMessage: string | null = null;\n    private toastTimer = 0;\n\n    public constructor(\n        private readonly root: HTMLElement,\n        private readonly getGameShell: () => HTMLElement | null,\n        private readonly isLiveMenuOpen: () => boolean,\n        private readonly isPageSuspended: () => boolean\n    ) {}\n\n    public report(message: string): void {\n        this.pendingMessage = message;\n        if (!this.isPageSuspended() && !this.isLiveMenuOpen()) {\n            this.showPending();\n        }\n    }\n\n    public takePendingHtml(): string {\n        const warning = this.pendingMessage;\n        this.pendingMessage = null;\n        return warning === null ? "" : `<p class="warning-message" role="status">${escapeHtml(warning)}</p>`;\n    }\n\n    public showPending(): void {\n        const warning = this.pendingMessage;\n        const shell = this.getGameShell();\n        if (warning === null || shell === null || this.isLiveMenuOpen()) {\n            return;\n        }\n        this.pendingMessage = null;\n        this.clearToast();\n        const element = document.createElement("div");\n        element.className = "persistence-warning";\n        element.setAttribute("role", "status");\n        element.textContent = warning;\n        shell.appendChild(element);\n        this.toastTimer = window.setTimeout(() => {\n            this.toastTimer = 0;\n            element.remove();\n        }, 6000);\n    }\n\n    public clearToast(): void {\n        if (this.toastTimer !== 0) {\n            clearTimeout(this.toastTimer);\n            this.toastTimer = 0;\n        }\n        this.root.querySelector(".persistence-warning")?.remove();\n    }\n}\n''',
    encoding="utf-8",
)

web_path = "pwa/src/app/JackalWebApp.ts"
replace_once(web_path, 'import { PageLifecycleMonitor } from "./PageLifecycleMonitor.js";\n', 'import { PageLifecycleMonitor } from "./PageLifecycleMonitor.js";\nimport { PersistenceWarningController } from "./PersistenceWarningController.js";\n')
replace_once(web_path, '    private readonly viewport: GameViewportController;\n', '    private readonly viewport: GameViewportController;\n    private readonly persistenceWarnings: PersistenceWarningController;\n')
replace_once(web_path, '    private pendingPersistenceWarning: string | null = null;\n    private persistenceWarningTimer = 0;\n', '')
replace_once(
    web_path,
    '        registerServiceWorker(BUILD_STAMP);',
    '''        this.persistenceWarnings = new PersistenceWarningController(\n            root,\n            () => this.viewport.gameShell,\n            () => this.liveMenuOpen,\n            () => this.pageLifecycle.suspended\n        );\n        registerServiceWorker(BUILD_STAMP);''',
)
replace_once(web_path, '${this.takePendingPersistenceWarningHtml()}', '${this.persistenceWarnings.takePendingHtml()}')
replace_count(web_path, 'this.reportPersistenceFailure(', 'this.persistenceWarnings.report(', 4)
replace_count(web_path, 'this.showPendingPersistenceWarning();', 'this.persistenceWarnings.showPending();', 2)
replace_once(web_path, '        this.clearPersistenceWarningToast();\n        this.viewport.clear();', '        this.persistenceWarnings.clearToast();\n        this.viewport.clear();')
web_text = read(web_path)
warning_block = re.compile(
    r"\n    private reportPersistenceFailure\(message: string\): void \{[\s\S]*?\n    private resetLifecycleSuspension\(\): void \{",
)
web_text, count = warning_block.subn('\n    private resetLifecycleSuspension(): void {', web_text, count=1)
if count != 1:
    raise SystemExit(f"Expected one inline persistence-warning helper block, found {count}.")
write(web_path, web_text)


# Windows can transiently reject the final lock-directory rename. Retry teardown,
# and mark the owner released before retrying so a leftover lock never looks live.
lock_path = "scripts/release-lock-utils.mjs"
replace_once(
    lock_path,
    'const ownerlessStaleMs = 10_000;\n',
    'const ownerlessStaleMs = 10_000;\nconst cleanupRetryCount = 10;\nconst cleanupRetryDelayMs = 10;\n',
)
replace_once(
    lock_path,
    '''function removeStaleLock(lockDir, message = null) {\n''',
    '''async function detachLockDirectoryWithRetry(lockDir, reason) {\n    for (let attempt = 0; attempt <= cleanupRetryCount; attempt++) {\n        const detached = detachLockDirectory(lockDir, reason);\n        if (detached !== false) {\n            return detached;\n        }\n        if (attempt < cleanupRetryCount) {\n            await delay(cleanupRetryDelayMs);\n        }\n    }\n    return false;\n}\n\nfunction removeStaleLock(lockDir, message = null) {\n''',
)
replace_once(lock_path, 'function removeOwnedLock(lockDir, token) {', 'async function removeOwnedLock(lockDir, token) {')
replace_once(
    lock_path,
    '''    if (holders.live.length > 0 || holders.malformed.length > 0) {\n        markOwnerReleased(lockDir, owner);\n        return;\n    }\n\n    const detachedDir = detachLockDirectory(lockDir, "released");\n    if (detachedDir === null || detachedDir === false) {\n        return;\n    }\n''',
    '''    if (holders.live.length > 0 || holders.malformed.length > 0) {\n        markOwnerReleased(lockDir, owner);\n        return;\n    }\n\n    markOwnerReleased(lockDir, owner);\n    const detachedDir = await detachLockDirectoryWithRetry(lockDir, "released");\n    if (detachedDir === null || detachedDir === false) {\n        return;\n    }\n''',
)
replace_once(
    lock_path,
    '    rmSync(detachedDir, { recursive: true, force: true });',
    '    rmSync(detachedDir, { recursive: true, force: true, maxRetries: cleanupRetryCount, retryDelay: cleanupRetryDelayMs });',
)
replace_once(lock_path, '            removeOwnedLock(resolvedLockDir, ownerToken);', '            await removeOwnedLock(resolvedLockDir, ownerToken);')
