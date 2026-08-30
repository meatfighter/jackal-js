# Jackal

Project page: https://meatfighter.com/jackal/

## Getting Started

To get oriented, start with these key points:

1. **`pwa/` is the browser game.** `pwa/src/jackal/` is the TypeScript gameplay port, structured to closely mirror the Java implementation; `pwa/src/app/` is the browser integration layer.
2. **`desktop/` is the Java game.** It is buildable and is the primary behavioral reference when checking gameplay parity.
3. **`about/` is the about page source.** It is assembled into the same production release as the PWA and desktop download.
4. **`scripts/` is the release system.** It owns component builds, version stamping, source provenance, path safety, desktop packaging, release verification, locking, atomic promotion, and recovery.
5. **`dist/` is the canonical production artifact.** Never turn a component build into production by manually copying files into `dist/`.
6. **Browser saves and settings are isolated by deployment.** Each deployment path gets its own saved games, input mappings, and settings, preventing production, staging, and other side-by-side installations from sharing browser state.
7. **A production release comes from `npm run build`.** That command runs the normal verification gate and the canonical release pipeline from source to promoted `dist/`.

For ordinary browser development:

```sh
npm ci
npm run dev
```

Before considering source changes release-ready:

```sh
npm run verify
```

For the canonical production artifact:

```sh
npm run build
```

On Windows, `npm.cmd` can be used instead of `npm`.

---

## Mental Model

The repository has three layers:

```text
SOURCE
  about/        about page
  pwa/          TypeScript browser game
  desktop/      Java desktop game
       |
       v
RELEASE TOOLING
  scripts/      build + verify + provenance + packaging + recovery
       |
       v
CANONICAL ARTIFACT
  dist/         exact promoted production release
```

Within the PWA, keep another boundary in mind:

```text
pwa/src/jackal/   game port
pwa/src/app/      browser/PWA integration
pwa/src/java/     helpers for preserving Java semantics
```

The normal production path is:

```text
clean Git checkout
       |
       v
npm run verify
       |
       v
capture source provenance + tracked-source hashes
       |
       v
generate transient build stamp
       |
       v
build PWA candidate
       |
       v
verify PWA relocation/precache
       |
       v
build about page + desktop ZIP
       |
       v
assemble full candidate + release manifest
       |
       v
verify entire candidate
       |
       v
recheck tracked source hashes
       |
       v
journal-promote candidate to dist/
```

The key distinction is that **development/component output is not canonical deployment output**.

### Source-of-truth quick reference

| Concern                      | Source of truth                                                                        | Generated/derived output                   |
| ---------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------ |
| Gameplay behavior            | `pwa/src/jackal/`, compared with `desktop/src/jackal/`                                 | bundled PWA JavaScript                     |
| Browser lifecycle/UI/storage | `pwa/src/app/`                                                                         | bundled PWA JavaScript                     |
| Java semantic helpers        | `pwa/src/java/`                                                                        | bundled PWA JavaScript                     |
| Save/continue format         | `pwa/src/jackal/persistence/`                                                          | browser save state                         |
| Static PWA/offline behavior  | `pwa/public/`, `pwa/vite.config.ts`                                                    | generated PWA release                      |
| About page                   | `about/`                                                                               | root of assembled release                  |
| Desktop Java source          | `desktop/src/`                                                                         | `desktop/target/` and desktop ZIP          |
| Desktop runtime contract     | `desktop/RUNTIME_DEPENDENCIES.md`, `desktop/lib/`, `desktop/natives/` in the full repo | packaged runtime files                     |
| Release version              | `version.json`                                                                         | generated build identity/release filenames |
| Production release logic     | `scripts/`                                                                             | `.release-work/` candidate then `dist/`    |
| Release integrity/provenance | release scripts + Git state                                                            | `dist/release.json`                        |

If generated output disagrees with source, fix source and rebuild. Never patch `dist/`, `.release-work/`, `.release-components/`, or `desktop/target/` to make a release appear correct.

---

## Release Deliverables

A full production build assembles three user-facing pieces into one promoted tree:

```text
dist/
├── index.html
├── styles.css
├── assets/
├── pwa/
├── downloads/
│   ├── jackal-desktop.zip
│   └── jackal-desktop-<version>.zip
└── release.json
```

The root about page links to:

- the browser game under `pwa/`;
- the stable desktop ZIP;
- the stable public GitHub repository for the project.

The stable and versioned desktop ZIPs are verified to be byte-for-byte identical.

`release.json` inventories the release files and records source provenance. It is part of the artifact integrity contract, not decorative metadata.

---

## Requirements

### Node and npm

Use a Node version accepted by `package.json`:

```text
^20.19.0 || ^22.13.0 || >=24
```

Install dependencies from the lockfile:

```sh
npm ci
```

The JavaScript toolchain uses TypeScript, Vite, ESLint, Prettier, and `slick2d-ts`.

The `slick2d-ts` dependency uses a compatible semver range in `package.json`, while `package-lock.json` records the exact resolved Git revision used by a given checkout. Treat dependency refreshes as deliberate gameplay/runtime changes, even when the range accepts them.

### Java

Use Java 21 LTS for current desktop release builds and smoke tests.

The Java source is compiled as Java 8-compatible bytecode, but Java 21 LTS is the primary current validation runtime for generated desktop releases.

### Maven

Maven is optional.

`npm run build:desktop` tries:

1. Maven on the host;
2. WSL2 Maven when running on Windows;
3. a direct `javac`/`jar` fallback.

The fallback keeps the desktop build available to developers with a JDK but no Maven installation.

### Git

Production provenance depends on Git. The normal production build requires a clean checkout, captures the exact source commit/URL, and hashes tracked source files before and after the build.

---

## Repository Layout

### Source and configuration

| Path                          | Purpose                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `about/`                      | Source template/assets for the about page.                                                                      |
| `pwa/`                        | TypeScript browser/PWA implementation.                                                                          |
| `pwa/src/app/`                | Browser shell, lifecycle, input/settings persistence, resource inventory, service-worker integration.           |
| `pwa/src/jackal/`             | Game port port.                                                                                                 |
| `pwa/src/jackal/persistence/` | Save-state schema, snapshot, stable entity registry, serializer, and browser store.                             |
| `pwa/src/java/`               | Compatibility helpers used to preserve selected Java semantics.                                                 |
| `pwa/public/`                 | Manifest, service-worker source, notices, icons, and game resources.                                            |
| `desktop/`                    | Java implementation plus desktop packaging/runtime material.                                                    |
| `scripts/`                    | Build, verification, versioning, source-provenance, path-safety, locking, ZIP, promotion, and recovery tooling. |
| `version.json`                | Tracked application version/build-stamp source.                                                                 |
| `package.json`                | Root command surface and JavaScript dependencies.                                                               |
| `package-lock.json`           | Reproducible JavaScript dependency resolution.                                                                  |
| `THIRD_PARTY_NOTICES.md`      | Root dependency/license notices.                                                                                |
| `LICENSE`                     | Project license.                                                                                                |

### Generated and local state

| Path                       | Purpose                                                  | Commit? |
| -------------------------- | -------------------------------------------------------- | ------- |
| `node_modules/`            | Installed JavaScript dependencies.                       | No      |
| `desktop/target/`          | Java compile/package output.                             | No      |
| `dist/`                    | **Canonical promoted production release.**               | No      |
| `.release-components/`     | Noncanonical PWA/web component output.                   | No      |
| `.release-work/`           | Full-release candidate and promotion/recovery workspace. | No      |
| `.release-candidates/`     | Persistent generated release coordination state.         | No      |
| `.release-secrets/`        | Reserved ignored/private release work area.              | No      |
| `.release-operation.lock*` | Generated release lock/recovery state.                   | No      |
| `releases/`                | Local staging for verified standalone desktop ZIPs.      | No      |

Generated directories are disposable only when no recovery workflow needs them. If an interrupted release left a journal/backup/candidate, run the recovery-aware release command before deleting state manually.

---

## Source Trees

### `about/` — About page

`about/` contains the source deployed at the release root.

The page body lives in `about/content.md`. `scripts/about-markdown.mjs` converts that constrained Markdown into HTML, then `scripts/build-about.mjs` injects it into the static `about/index.html` shell with `about/styles.css`, `about/theme.js`, and assets from `about/assets/`.

`scripts/build-about.mjs` stamps the Markdown and template with release-derived values such as:

- application version;
- build stamp;
- versioned PWA URL;
- desktop ZIP download URL;
- screenshot/title image URLs.

The public Source link intentionally points at the stable `https://github.com/meatfighter/jackal-js` repository. Exact build provenance belongs to `release.json`, not to a user-facing page link. Do not hard-code generated cache-busting/download query strings into the Markdown or template; those values belong to the release process.

### `pwa/` — Browser/PWA port

`pwa/` is a Vite application using the root package installation.

Its source is organized around a strong separation of responsibilities:

```text
pwa/src/
├── main.ts
├── styles.css
├── app/                    # browser/PWA shell
├── jackal/                 # game port
│   └── persistence/        # save/continue implementation
└── java/                   # Java compatibility helpers
```

#### `pwa/src/jackal/`

This is the main TypeScript game port.

It contains player/enemy/game-object classes, stages/managers, modes, menus, input abstractions, bosses, projectiles, cutscenes, and game state.

The classes intentionally map closely to Java classes under `desktop/src/jackal/`.

When gameplay parity matters:

1. locate the TypeScript class;
2. locate the similarly named Java class;
3. compare behavior directly;
4. distinguish a real parity fix from an intentional browser-only divergence.

#### `pwa/src/app/`

This directory is the browser integration layer.

Important files include:

- `JackalWebApp.ts` — browser/menu/game lifecycle, resource preparation, save/continue integration, responsive sizing, audio/UI coordination, and focus/visibility behavior;
- `DeploymentStorageKeys.ts` — deployment-path-based browser namespaces;
- `JackalInputMappingStore.ts` — persistent keyboard/gamepad mappings;
- `ResourceManifest.ts` — explicit game resource inventory;
- `ServiceWorkerRegistrar.ts` — production registration and development cleanup behavior.

#### `pwa/src/java/`

This directory contains small compatibility helpers used where preserving Java-like semantics makes the TypeScript port easier to compare with the original code.

It is not an attempt to recreate the Java runtime.

Keep helpers narrow and behavior-motivated.

#### `pwa/src/jackal/persistence/`

Save/continue is implemented as a dedicated persistence layer responsible for capturing, storing, validating, and restoring game state.

Important pieces are:

- `GameStateSchema.ts` — serialized-format/version constants;
- `GameStateSnapshot.ts` — typed snapshot structures;
- `GameElementTypeRegistry.ts` — stable serialized IDs for entity types;
- `JavaFloatState.ts` — generated Java `float` field map used to normalize restored saves;
- `JackalGameStateSerializer.ts` — converts live state to/from snapshots;
- `JackalGameStateStore.ts` — local-storage persistence/validation.

The stable entity registry is deliberate. Renaming, reordering, or minifying classes must not silently reinterpret an older save as a different game object type.

### `desktop/` — Java desktop version

The desktop tree serves two purposes:

1. preserve/build the original Java implementation;
2. provide a behavioral reference for the TypeScript port.

The full project includes Java source plus runtime packaging material:

```text
desktop/
├── src/
│   ├── jackal/
│   ├── maps/
│   └── org/newdawn/slick/
├── lib/
├── natives/
├── licenses/
├── sources/
├── pom.xml
├── assembly.xml
├── run-windows.cmd
├── run-windows.ps1
├── run-linux.sh
├── run-macos.sh
├── README.md
└── RUNTIME_DEPENDENCIES.md
```

#### Desktop runtime contract

The desktop distribution includes Slick2D, LWJGL 2, JInput, and JOrbis/Jogg-era dependencies.

The package verifier checks required runtime/native entries, including the 64-bit native files needed by packaged platform launchers.

The historical `jinput.jar` is also checked for the embedded JUtils plugin class expected by this runtime configuration. A future dependency replacement that breaks that assumption should fail packaging rather than produce a subtly broken controller build.

#### Desktop compliance material

The desktop ZIP contains license/notice and corresponding-source material required by redistributed dependencies.

Keep these synchronized when changing runtime dependencies:

- `desktop/RUNTIME_DEPENDENCIES.md`;
- `desktop/lib/`;
- `desktop/natives/`;
- `desktop/licenses/`;
- `desktop/sources/`;
- desktop build/verification scripts.

Only advertise an OS/JVM combination after launching the **actual generated ZIP** on that exact combination.

### `scripts/` — Build and release system

The root scripts are grouped by responsibility.

| Area                   | Representative scripts                                                                                                        | Responsibility                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Build orchestration    | `build-pwa-release.mjs`, `build-web-release.mjs`, `build-about.mjs`, `build-desktop.mjs`, `assemble.mjs`, `build-release.mjs` | Create component and full candidates.                                                     |
| Release verification   | `verify-pwa-precache.mjs`, `verify-desktop-zip.mjs`, `verify-release-candidate.mjs`                                           | Validate PWA relocation/precache, desktop ZIP, and full release.                          |
| Manifest/integrity     | `release-manifest.mjs`, `write-release-manifest.mjs`                                                                          | Inventory release files, sizes, and SHA-256 values.                                       |
| Source provenance      | `source-state-utils.mjs`                                                                                                      | Capture clean source commit/URL and tracked-source hashes.                                |
| Version/build stamps   | `version-stamp-utils.mjs`, `stamp-build.mjs`                                                                                  | Manage tracked/manual and transient build identities.                                     |
| Release locking        | `release-lock-utils.mjs`                                                                                                      | Reentrant owner/holder lock and stale recovery.                                           |
| Atomic promotion       | `release-atomic-utils.mjs`, `atomic-file-utils.mjs`                                                                           | Crash-safe candidate promotion and atomic control-file writes.                            |
| Path/filesystem safety | `build-utils.mjs`                                                                                                             | Canonical paths, generated-output policies, link/path validation.                         |
| ZIP/process helpers    | `zip-utils.mjs`, `run-utils.mjs`                                                                                              | Packaging/inspection and consistent child-process execution.                              |
| Tests                  | `test-*.mjs`                                                                                                                  | Exercise persistent state, PWA scoping, provenance, lock/recovery, and release hardening. |

When changing release infrastructure, add tests for the failure mode. A happy-path build does not exercise crashes, races, stale locks, dirty source, or malicious/accidental path layouts.

---

## Daily Development Workflow

### Start the browser game

```sh
npm run dev
```

This starts the Vite development server on loopback.

In development, service-worker cleanup is scope-aware. It removes stale Jackal registrations belonging to the current development application scope without indiscriminately unregistering unrelated localhost applications or adjacent deployments.

### Run the normal verification gate

```sh
npm run verify
```

The current `verify` command runs:

1. Node tests;
2. Prettier check;
3. ESLint;
4. TypeScript type checking;
5. the zero-`@ts-nocheck` policy check;
6. the zero explicit-TypeScript-`any` policy check.

Useful individual commands:

```sh
npm test
npm run format:check
npm run lint
npm run typecheck
npm run check:ts-nocheck
npm run check:explicit-any
```

### Format source

```sh
npm run format
```

Do not hand-format generated output. Format the source that produces it.

### Build/run desktop

```sh
npm run build:desktop
npm run verify:desktop
npm run run:desktop
```

---

## Browser/PWA Architecture

### Slick2D compatibility layer

The PWA uses `slick2d-ts`, a TypeScript/browser adaptation of the Slick2D APIs used by the Java game.

The browser entry point wraps Jackal in `BufferedScalableGame` rather than the Java-shaped `ScalableGame`. Jackal renders each frame into a fixed `1024x960` offscreen framebuffer first, then the completed frame is presented to the browser canvas. That keeps sprite transforms, rotations, clips, fades, and HUD rendering stable when the page is displayed at fractional responsive sizes or high-DPI backing-store sizes.

Keep that buffering decision in `pwa/src/app/JackalWebApp.ts`. The translated `Main.ts` class intentionally remains close to the Java source, including its legacy `ScalableGame` field and `javaMain()` shape.

### Game timing

The TypeScript port preserves the original fixed-step gameplay model rather than tying simulation speed directly to browser render frequency.

The browser/container layer must keep separate concepts of:

- rendering cadence;
- gameplay update cadence;
- browser suspension/visibility interruptions.

When execution resumes after a hidden/suspended tab, timing state must be reset appropriately instead of processing an enormous backlog of missed updates.

Small timing changes can alter movement, collisions, enemy behavior, or input feel. Treat timing code as gameplay-sensitive.

### Browser shell and lifecycle

`JackalWebApp.ts` coordinates concerns that do not belong in the Java-shaped gameplay classes:

- page/menu startup;
- canvas/container lifecycle;
- fullscreen/responsive sizing;
- resource preparation;
- save/continue integration;
- volume/UI coordination;
- focus/visibility handling;
- service-worker integration;
- persistent input mappings.

Keep this separation intact.

### Resource loading

`pwa/src/app/ResourceManifest.ts` is the application-level inventory used by startup/preload logic.

The generated service-worker precache is a separate release-level inventory.

If a resource changes:

1. confirm the application still prepares/loads it;
2. build the PWA;
3. verify the generated precache/output;
4. test from a non-root path if URL layout changed.

---

## Deployment-Relative PWA Design

The PWA is intentionally relocatable.

The same built application can be served from different paths, including production, staging, and nested preview roots.

### Vite base

Production Vite builds use relative static URLs rather than assuming one fixed server pathname.

Do not introduce root-absolute application resource paths casually.

### Service-worker scope and cache identity

`pwa/public/sw.js` derives application identity from `self.registration.scope`.

The cache name includes:

- application version;
- build stamp;
- encoded deployment scope.

Conceptually:

```text
jackal | <deployment-scope> | <version>-<build-stamp>
```

This prevents two side-by-side Jackal installations from treating each other’s caches as their own.

### Browser storage scope

`DeploymentStorageKeys.ts` namespaces persistent data by deployment directory path.

Separate roots therefore get separate storage buckets for:

- saved games;
- input mappings;
- volume/settings state.

Query strings are intentionally ignored for deployment identity so adding a cache-busting query does not create a new logical save namespace.

### Development service-worker cleanup

Development cleanup is scope-aware. It must not unregister arbitrary workers from unrelated localhost apps or neighboring Jackal deployments.

### Precache verification

`scripts/verify-pwa-precache.mjs` tests built output under multiple hypothetical deployment roots and rejects hard-coded runtime paths or incomplete resource sets.

Run full verification whenever changing:

- `pwa/public/sw.js`;
- `pwa/vite.config.ts`;
- deployment storage;
- resource URL generation;
- service-worker registration;
- static PWA resource layout.

---

## Persistent State

The browser port persists enough state to continue a game across page sessions.

This requires more than serializing a few top-level fields: runtime state includes game elements, references, modes, input/config state, random state, and other mode-specific state.

The persistence layer therefore uses an explicit snapshot format.

Key concepts:

- **schema version** — identifies the serialized format;
- **application version** — records the application build associated with the snapshot;
- **stable entity IDs** — prevent runtime class ordering/naming from changing save meaning;
- **encoded references** — preserve relationships between runtime objects;
- **mode-specific snapshots** — represent state beyond ordinary gameplay mode;
- **restore validation** — rejects or handles malformed/incompatible data deliberately.

When changing persistent state:

1. decide whether the change is backward-compatible;
2. update the snapshot/serializer deliberately;
3. bump `GAME_STATE_VERSION` when old snapshots should be invalidated;
4. preserve stable entity IDs;
5. update schema/entity tests;
6. test New Game and Continue;
7. test saves created in more than one mode/stage;
8. test after a real page reload.

During private development, incompatible old browser saves may be cleared instead of migrated. Make that choice explicit by bumping the schema version rather than leaving stale compatibility code in the serializer.

---

## TypeScript Strategy

The browser gameplay port is type-checked TypeScript. `@ts-nocheck` and explicit TypeScript `any` are intentionally not allowed in PWA TypeScript source.

The repository enforces those rules with:

```sh
npm run check:ts-nocheck
npm run check:explicit-any
```

Both budgets are zero.

The compiler runs with TypeScript `strict` mode enabled, including `strictNullChecks`. `strictPropertyInitialization` remains disabled because the Java-shaped port still deliberately uses translated initialization hooks and lifecycle-populated fields. Where Java fields are temporarily null during setup or restore, the TypeScript source uses erased non-null assertions such as `null!` so the emitted JavaScript keeps the translated runtime behavior.

Most gameplay classes were adapted from Java, so the TypeScript is still shaped like the source port. In particular, `GameElement` calls translated initialization hooks during construction to reproduce Java object initialization order.

When working in translated gameplay files:

- use no-emit `declare` fields for translated subclass fields whose values are assigned by `__initializeJavaSubclassDefaults()`;
- do not replace those declarations with normal field initializers unless you have checked the `super()` ordering and runtime behavior;
- preserve Java behavior unless intentionally fixing a known translation issue;
- keep type-only cleanup separate from unrelated gameplay rewrites;
- preserve constructor overload signatures for Java classes with multiple public constructors;
- run `npm run verify` and smoke-test affected mechanics.

Two Java patterns need special care in TypeScript/JavaScript:

- **field hiding**: Java can hide a superclass field with a subclass field of the same name, but JavaScript has one property namespace.
- **translated private/runtime names**: avoid subclass fields that collide with library superclass internals. For example, the title-screen image is `Main.titleImage` so it does not collide with Slick's `BasicGame` title string.
- **Java float boundaries**: Java `float` stores and operations round to IEEE-754 binary32, while JavaScript `number` is binary64. Gameplay code uses `javaFloat(...)` where the original Java source stores, passes, returns, or operates on `float` state that can affect future mechanics.

If the policy evolves, prefer a stricter allowlist or explicit exception file rather than weakening the check.

`scripts/test-java-translation-parity-guardrails.mjs` protects a few translated Java edge cases that are easy to accidentally "simplify" into different JavaScript behavior, including Java field hiding, boolean XOR translation, constructor overload signatures, and `useDefineForClassFields: false`.

Java-float parity is checked by generated metadata under `scripts/java-float-parity/`. The metadata is derived from `desktop/src/jackal`, and the checkers verify TypeScript storage/operation boundaries plus the generated save-restore normalization table. The generated `JavaFloatState.ts` map runs only while restoring saved state, so legacy binary64 browser values are rounded back to Java-compatible float state before gameplay resumes.

Additional parity and performance guardrails are available through:

```sh
npm run test:parity
npm run check:java-float-parity
npm run benchmark:directions
npm run benchmark:float-parity
```

`test:parity` runs the Java translation guardrails, JavaRuntime actual-use contracts, Java/TypeScript structural parity checks, Java-vs-TypeScript mechanics differentials, direction-cache parity checks, Java-float parity tests, and persistence field coverage. The benchmarks are informational and are intentionally not CI timing thresholds.

---

## Versioning and Build Identity

`version.json` is the tracked version source.

It contains:

- the human/application release version;
- a build stamp used to distinguish generated browser/release artifacts.

### Manual stamp

```sh
npm run stamp
```

intentionally updates the tracked build stamp.

### Production/component release stamp

Normal release commands generate an effective build stamp without permanently rewriting tracked source.

The release tooling supplies the effective version through the build environment (including `JACKAL_BUILD_VERSION_JSON`) so Vite/service-worker/about output receives the release identity while `version.json` remains source.

This is an important invariant:

> Building a production release should not make the source tree dirty merely because the build needed a fresh cache identity.

Generated stamp coordination under `.release-candidates/` is release state, not source.

---

## Build and Release Workflows

There are separate commands for component output, desktop output, and the canonical production release.

### PWA component build

```sh
npm run build:pwa
```

This builds/verifies PWA component output under generated release-component storage.

It does **not** create canonical `dist/`.

### Web component build

```sh
npm run build:web
```

This runs `verify`, then builds the about page, PWA, and verified desktop ZIP together under:

```text
.release-components/web/
```

Use it when reviewing the complete web deliverable without canonical promotion to `dist/`.

### About component build

```sh
npm run build:about
```

This stamps the public project page into the managed web component location used by the component workflow.

### Desktop build

```sh
npm run build:desktop
```

Expected generated desktop output includes the JAR, ZIP, classes, and staged distribution under `desktop/target/`.

Verify it with:

```sh
npm run verify:desktop
```

### Standalone desktop release

```sh
npm run release:desktop
```

This performs the source/build/verify/stage workflow and copies a verified desktop ZIP to local `releases/`.

It is not the full site release.

### Canonical production release

```sh
npm run build
```

This is the production workflow.

It runs the normal source verification gate and then `scripts/build-release.mjs`.

Do not replace it with ad-hoc component builds and manual copies into `dist/`.

### Build-command quick reference

| Goal                                   | Command                       | Output                     |
| -------------------------------------- | ----------------------------- | -------------------------- |
| Develop browser game                   | `npm run dev`                 | Vite dev server            |
| Run normal source gate                 | `npm run verify`              | checks only                |
| Build PWA component                    | `npm run build:pwa`           | `.release-components/pwa/` |
| Build complete web component           | `npm run build:web`           | `.release-components/web/` |
| Build desktop package                  | `npm run build:desktop`       | `desktop/target/`          |
| Verify desktop ZIP                     | `npm run verify:desktop`      | validation only            |
| Stage standalone desktop ZIP           | `npm run release:desktop`     | `releases/`                |
| **Build canonical production release** | **`npm run build`**           | **`dist/`**                |
| Verify promoted release                | `npm run verify:release`      | validation only            |
| Verify PWA precache/relocation         | `npm run verify:pwa-precache` | validation only            |

---

## Production Release Pipeline

`npm run build` runs `verify` and then the canonical release script.

At a high level:

```text
source verification
       ↓
recover interrupted old promotion
       ↓
capture source provenance
       ↓
hash tracked source
       ↓
generate effective build stamp
       ↓
build PWA candidate
       ↓
verify PWA/precache/relocation
       ↓
build about page
       ↓
build + verify desktop package
       ↓
assemble complete candidate
       ↓
write release.json
       ↓
verify entire candidate
       ↓
recheck tracked source hashes
       ↓
journal-promote candidate to dist/
```

More concretely, the production flow:

1. acquires the release-operation lock;
2. recovers an interrupted previous promotion when necessary;
3. requires clean Git state by default and captures exact source provenance;
4. records tracked source file hashes;
5. cleans the managed `.release-work/` workspace;
6. generates an effective build stamp without dirtying tracked source;
7. builds the PWA candidate;
8. verifies PWA resource completeness and relocatability;
9. builds the project/about page from Markdown content;
10. builds the desktop JAR/ZIP;
11. verifies/copies desktop downloads into the candidate;
12. writes `release.json`;
13. verifies the complete release;
14. confirms tracked source has not changed during the build;
15. journal-promotes the candidate to `dist/`.

Only after those steps is `dist/` the new canonical release.

---

## Release Safety and Provenance

### Clean checkout

Normal production builds require a clean Git working tree.

The release check includes tracked changes and non-ignored untracked files.

A production artifact naming commit `abc123` is meaningful only when the source bytes used to build it actually correspond to that commit.

### Deliberate dirty-build override

For local validation only, the release pipeline supports the explicit environment override:

```sh
JACKAL_ALLOW_DIRTY_RELEASE=1 npm run build
```

PowerShell:

```powershell
$env:JACKAL_ALLOW_DIRTY_RELEASE = "1"
npm.cmd run build
```

The resulting release records that it was dirty.

Do **not** use this override for a normal public release.

### Source provenance

A normal clean release records:

- exact source commit;
- exact source URL;
- clean/dirty provenance as appropriate.

The generated About-page Source link intentionally points at the stable public repository URL. The exact source URL remains in `release.json`.

### Source cannot change mid-build

The release hashes tracked source before candidate creation and again before promotion.

If a developer/process edits tracked source mid-build, promotion fails rather than producing one artifact assembled from multiple source states.

### Managed output paths

Release tooling distinguishes source directories from approved generated directories.

Checks prevent errors such as:

- component output writing into `dist/`;
- cleanup targeting the repository root;
- output escaping its allowed generated root;
- symlink/junction redirection into source;
- generated output overlapping protected tracked source;
- arbitrary paths being accepted as trusted production destinations.

### Release-operation lock

Release commands can invoke other release commands. `release-lock-utils.mjs` provides a reentrant filesystem lock so nested child operations can participate in the same release without deadlocking or racing.

The lock tracks an owner plus nested holder processes.

Stale recovery checks process liveness and uses guarded atomic detachment/cleanup so two stale-lock recoverers do not race each other.

If changing lock logic, run concurrency tests repeatedly.

### Atomic file writes

Release control files use temporary-file + rename patterns rather than unsafe in-place overwrites.

Use the shared atomic helper when adding new release-control metadata.

### Journaled production promotion

A verified candidate is promoted using recovery-aware journal state.

Conceptually:

```text
journal = prepared
       ↓
existing dist -> backup
       ↓
candidate -> dist
       ↓
journal marks promoted state
       ↓
remove old backup
       ↓
remove journal
```

If the process dies, the next release can inspect filesystem + journal state and conservatively preserve the previous complete release or the new complete release.

Do not simplify this to:

```text
delete dist
move candidate to dist
```

That would remove the crash-consistency guarantees.

---

## Release Manifest

Every full release contains:

```text
dist/release.json
```

The manifest records release provenance and inventories generated files with sizes and SHA-256 hashes.

Conceptually:

```json
{
    "version": "1.0.0",
    "buildStamp": "...",
    "sourceCommit": "...",
    "sourceUrl": "...",
    "files": [
        {
            "path": "pwa/index.html",
            "bytes": 1234,
            "sha256": "..."
        }
    ]
}
```

Verification checks that:

- every manifest entry exists;
- byte sizes match;
- SHA-256 values match;
- no generated files are missing from the manifest;
- no unexpected generated files exist outside the manifest;
- required source provenance exists;
- stable/versioned desktop ZIPs are identical;
- the desktop ZIP contains required launchers, runtime JARs, natives, notices, licenses, and corresponding-source material.

Run:

```sh
npm run verify:release
```

to validate promoted `dist/`.

The manifest is an integrity inventory, not a substitute for external artifact signing.

---

## Generated Directory Lifecycle

### `.release-components/`

Noncanonical component output.

Examples include PWA and web component builds.

Safe to regenerate. Do not deploy it as if it were a full verified release.

### `.release-work/`

Temporary full-production workspace.

It contains the candidate and promotion/recovery state used by the current full release.

A failed/interrupted build may leave state that recovery needs to inspect before cleanup.

### `.release-candidates/`

Persistent generated release coordination state such as build-stamp coordination.

It is not source and should not be committed.

### `.release-secrets/`

Reserved ignored/private release work area.

Do not confuse it with deployable artifact content.

### `.release-operation.lock*`

Generated owner/holder/pending/recovery/stale lock state.

Normally managed entirely by release tooling.

### `desktop/target/`

Java compile/package output.

Delete/regenerate rather than edit.

### `releases/`

Local staging for verified standalone desktop ZIPs.

### `dist/`

Canonical promoted production release.

Treat it as generated deployment output.

---

## Testing

### Normal automated gate

```sh
npm run verify
```

covers Node tests, formatting, lint, type checking, and the unchecked-TypeScript / explicit-`any` ratchets.

The Node tests focus heavily on infrastructure state that is easy to miss during manual play testing, including:

- deployment-scoped storage keys;
- stable save-state schema/entity identifiers;
- input mapping persistence;
- volume persistence;
- service-worker cache scoping/versioning;
- development service-worker cleanup boundaries;
- version/build-stamp propagation;
- release path safety;
- source provenance;
- atomic-promotion crash recovery;
- release lock contention/stale recovery/reentrant children;
- complete release verification contracts.

### PWA artifact verification

```sh
npm run verify:pwa-precache
```

validates generated PWA precache/relocation assumptions.

### Desktop artifact verification

```sh
npm run verify:desktop
```

validates the generated desktop ZIP and its runtime/compliance contract.

### Full release verification

```sh
npm run verify:release
```

re-verifies the promoted production tree and manifest.

### CI

The full repository's GitHub Actions workflow uses the same high-level developer/release commands rather than maintaining a separate build implementation in YAML.

The current documented CI path uses Node `22.13.0` and Temurin Java 21 and runs approximately:

```sh
npm ci
npm run verify
npm run build
```

That means CI exercises the real release orchestration—including PWA verification, desktop packaging, source provenance, manifest verification, and promotion code—not merely lint/type checks.

### Gameplay/parity smoke testing

Automated release tests do not replace gameplay testing.

For gameplay changes:

- test the changed mechanic;
- test nearby systems that depend on it;
- compare TypeScript with Java when parity matters;
- run `npm run test:parity` when translated Java behavior, persistence, or hot-path direction lookup may be affected;
- run `npm run check:java-float-parity` when Java `float` storage, math, constructor parameters, or save-state normalization may be affected;
- broaden testing for timing/input changes.

---

## Common Change Workflows

### Changing gameplay

1. Start in `pwa/src/jackal/`.
2. Find the corresponding Java class in `desktop/src/jackal/`.
3. Determine whether the change is a parity fix, intentional browser divergence, or new shared behavior.
4. Keep browser-only behavior in `pwa/src/app/` when practical.
5. Run `npm run verify`.
6. Play-test the affected mechanic and adjacent systems.

### Changing save/continue

1. Review `pwa/src/jackal/persistence/`.
2. Decide whether the snapshot format remains backward-compatible.
3. Preserve stable entity type IDs.
4. Update schema/serializer/store tests.
5. Test saves in multiple game/mode states.
6. Test after a real page reload.

### Changing browser input mappings/settings

1. start with `JackalInputMappingStore.ts` and the browser shell;
2. preserve deployment-scoped keys;
3. test keyboard + physical gamepad;
4. test persistence after reload;
5. test staging/non-root deployment if key derivation changed.

### Adding or moving PWA resources

1. update files under `pwa/public/resources/`;
2. update `ResourceManifest.ts` when startup must prepare the resource;
3. build the PWA;
4. run `verify:pwa-precache`;
5. test from a non-root path if URL behavior changed.

### Changing service-worker behavior

1. update `pwa/public/sw.js` and/or `ServiceWorkerRegistrar.ts`;
2. consider side-by-side deployments;
3. consider online navigation and offline fallback;
4. consider update behavior with an already-running game;
5. run service-worker/release tests;
6. manually test install, offline reload, and upgrade.

### Changing desktop dependencies

Update together:

- `desktop/lib/`;
- `desktop/natives/`;
- launcher/runtime assumptions;
- `desktop/RUNTIME_DEPENDENCIES.md`;
- license/notice files;
- corresponding source;
- desktop build/verifier requirements.

Then launch the **generated ZIP** on every OS/JVM combination you intend to advertise.

### Changing release infrastructure

1. identify the generated-path policy involved;
2. preserve the rule that only the canonical full release promotes to `dist/`;
3. add tests for failure states, not just happy paths;
4. think about process death between filesystem operations;
5. preserve source provenance and final source-hash checks;
6. run `npm run verify` repeatedly when concurrency behavior changes;
7. run a full production build from a clean checkout.

---

## Useful Commands

| Command                           | Purpose                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Start local PWA development server.                                                             |
| `npm run clean`                   | Remove/recreate managed canonical `dist/` output.                                               |
| `npm test`                        | Run Node test suite.                                                                            |
| `npm run format`                  | Apply Prettier.                                                                                 |
| `npm run format:check`            | Check formatting.                                                                               |
| `npm run lint`                    | Run ESLint.                                                                                     |
| `npm run typecheck`               | Run TypeScript compiler without emitting.                                                       |
| `npm run check:ts-nocheck`        | Enforce the zero-`@ts-nocheck` policy.                                                          |
| `npm run check:explicit-any`      | Enforce the zero explicit-TypeScript-`any` policy.                                              |
| `npm run check:java-float-parity` | Verify Java `float` metadata, storage boundaries, operation boundaries, and save normalization. |
| `npm run verify`                  | Run the normal source-quality gate.                                                             |
| `npm run build:pwa`               | Build/verify PWA component output.                                                              |
| `npm run build:web`               | Build verified about + PWA + desktop ZIP component output.                                      |
| `npm run build:about`             | Build the about-page component.                                                                 |
| `npm run build:desktop`           | Build desktop JAR/ZIP.                                                                          |
| `npm run verify:desktop`          | Verify generated desktop ZIP.                                                                   |
| `npm run release:desktop`         | Stage a verified standalone desktop ZIP.                                                        |
| `npm run run:desktop`             | Run desktop Java build.                                                                         |
| **`npm run build`**               | **Build, verify, and promote full production release to `dist/`.**                              |
| `npm run verify:release`          | Verify promoted release manifest/artifacts.                                                     |
| `npm run verify:pwa-precache`     | Verify PWA precache/relocation behavior.                                                        |
| `npm run benchmark:float-parity`  | Run an informational Java-float parity microbenchmark.                                          |
| `npm run preview:pwa`             | Preview PWA build configuration.                                                                |
| `npm run preview:dist`            | Serve promoted `dist/` locally.                                                                 |
| `npm run stamp`                   | Intentionally update tracked `version.json` build stamp.                                        |

---

## Where Do I Make This Change?

| Goal                                  | Start here                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| Player/enemy/game mechanics           | `pwa/src/jackal/`, compare `desktop/src/jackal/`                                       |
| Browser menu/game shell               | `pwa/src/app/JackalWebApp.ts`                                                          |
| Keyboard/gamepad mapping persistence  | `pwa/src/app/JackalInputMappingStore.ts`                                               |
| Save/continue serialization           | `pwa/src/jackal/persistence/`                                                          |
| Stable saved-entity IDs               | `pwa/src/jackal/persistence/GameElementTypeRegistry.ts`                                |
| Deployment-specific local storage     | `pwa/src/app/DeploymentStorageKeys.ts`                                                 |
| Service-worker registration           | `pwa/src/app/ServiceWorkerRegistrar.ts`                                                |
| Offline/cache strategy                | `pwa/public/sw.js`                                                                     |
| PWA build/precache generation         | `pwa/vite.config.ts`                                                                   |
| Game preload resource inventory       | `pwa/src/app/ResourceManifest.ts`                                                      |
| Java compatibility helpers            | `pwa/src/java/`                                                                        |
| Public project/about page             | `about/`, `scripts/build-about.mjs`                                                    |
| Desktop Java behavior                 | `desktop/src/jackal/`                                                                  |
| Desktop runtime dependencies          | `desktop/RUNTIME_DEPENDENCIES.md`, full-repo `desktop/lib/`, `desktop/natives/`        |
| Desktop packaging                     | `scripts/build-desktop.mjs`, `scripts/verify-desktop-zip.mjs`                          |
| Full release orchestration            | `scripts/build-release.mjs`                                                            |
| Release manifest                      | `scripts/release-manifest.mjs`, `scripts/write-release-manifest.mjs`                   |
| Source provenance                     | `scripts/source-state-utils.mjs`                                                       |
| Release locking                       | `scripts/release-lock-utils.mjs`                                                       |
| Atomic promotion/recovery             | `scripts/release-atomic-utils.mjs`                                                     |
| Atomic control-file writes            | `scripts/atomic-file-utils.mjs`                                                        |
| Output/path safety                    | `scripts/build-utils.mjs`                                                              |
| Version/build stamps                  | `version.json`, `scripts/version-stamp-utils.mjs`, `scripts/stamp-build.mjs`           |
| Zero-`@ts-nocheck` policy             | `scripts/check-ts-nocheck-budget.mjs`                                                  |
| Zero explicit-TypeScript-`any` policy | `scripts/check-explicit-any.mjs`                                                       |
| Java translation parity guardrails    | `scripts/test-java-translation-parity-guardrails.mjs`                                  |
| Java/TypeScript structural parity     | `scripts/test-java-ts-structural-parity.mjs`, `scripts/java-ts-parity-exceptions.json` |
| JavaRuntime usage contracts           | `scripts/test-java-runtime-jackal-contracts.mjs`                                       |
| Mechanics differential testing        | `scripts/test-java-ts-mechanics-differential.mjs`                                      |
| Java-float parity tooling             | `scripts/check-java-float-parity.mjs`, `scripts/java-float-parity/`                    |
| Direction-cache parity/benchmark      | `scripts/test-direction-cache-parity.mjs`, `scripts/benchmark-direction-cache.mjs`     |
| Persistence field coverage            | `scripts/test-persistence-parity-coverage.mjs`                                         |
| Third-party notices/source            | root/PWA notices plus desktop license/source material                                  |

---

## Production Release Checklist

Start from the full repository and a clean, committed checkout whose intended source commit is available at the public source location.

Run:

```sh
git status --porcelain
npm ci
npm run verify
npm run build
npm run verify:release
npm run verify:pwa-precache
git status --porcelain
```

Do **not** set `JACKAL_ALLOW_DIRTY_RELEASE` for a normal public release.

Both Git-status checks should show no unexpected source changes.

### PWA smoke test

Test the generated `dist/pwa/`, not merely the development server:

- New Game;
- Continue/save;
- keyboard input;
- physical gamepad input and mapping;
- fullscreen enter/exit;
- volume/settings persistence;
- tab hide/focus/resume;
- online reload;
- offline reload after installation;
- service-worker upgrade from an older release;
- side-by-side/non-root deployment when deployment logic changed.

### Desktop smoke test

Extract and launch the actual generated desktop ZIP.

For every OS/JVM combination you intend to advertise, test:

- application startup;
- keyboard controls;
- physical controller detection/input;
- audio;
- representative gameplay/stage play;
- launcher scripts;
- native discovery.

### Provenance check

Inspect `dist/release.json` and confirm:

- `sourceCommit` is the intended release commit;
- `sourceUrl` opens that exact commit;
- dirty provenance is not present for a normal clean release;
- the About-page Source link points at the stable public repository URL.

Deploy `dist/` only after those checks pass.

---

## Troubleshooting

### `build:desktop` reports a missing runtime JAR/native

Stripped review archives may intentionally omit large runtime files.

In the full repository, check `desktop/RUNTIME_DEPENDENCIES.md` and restore the expected runtime material.

Do not weaken the verifier to make an incomplete review archive act like the full release repository.

### Production build says the checkout is dirty

Run:

```sh
git status --porcelain
```

Resolve unexpected changes before a public production build.

Use the explicit dirty override only for deliberate local validation.

### A release lock remains after a killed process

Run the normal release command again first.

The lock implementation includes process-aware stale recovery. Do not blindly delete lock state while another release command may still be active.

### A promotion journal/candidate remains after interruption

Run the normal full release path. Recovery executes before the release workspace is cleaned for new output.

Avoid manually deleting candidate/backup/journal state until you understand which `dist/` tree is complete.

### PWA works at one URL but fails at staging/subdirectory path

Look for hard-coded paths in:

- service-worker code;
- resource URLs;
- Vite/generated output;
- browser storage assumptions;
- service-worker registration.

Run:

```sh
npm run verify:pwa-precache
```

which intentionally tests multiple deployment roots.

### Save/continue disappears after moving the application

Persistent state is deployment-directory-scoped.

A different path intentionally gets a different namespace. Query-string-only changes should not.

### A new PWA release does not instantly replace the worker controlling an open game

Do not assume this is a defect. The release avoids aggressive forced mid-session takeover.

Test the normal browser service-worker lifecycle as part of deployment acceptance.

---

## Design Principles

The repository’s architecture and release machinery enforce a small set of rules:

1. **Preserve behavioral parity where it matters.** The TypeScript gameplay tree remains directly comparable with Java.
2. **Keep browser concerns outside gameplay code.** PWA lifecycle, storage, caching, and page UI belong in the browser layer.
3. **Treat save-state IDs/schema as compatibility contracts.**
4. **Treat generated artifacts as disposable until verified.**
5. **Only the canonical full-release path may replace `dist/`.**
6. **A production artifact must identify the exact source that produced it.**
7. **Tracked source must not change underneath a running release build.**
8. **A crash during promotion must not destroy the previous good release.**
9. **Parallel/nested release scripts must not race.**
10. **Side-by-side PWA deployments must not interfere with each other’s caches or persistent storage.**
11. **Release verification should inspect the generated artifact, not merely trust the build command.**
12. **Translated TypeScript should stay checked while preserving Java initialization semantics.**
13. **Legacy desktop dependency changes include runtime, launcher, license, notice, source, and verifier updates as one coordinated change.**

If a shortcut violates one of these rules, understand why the guardrail exists before removing it.

---

## License and Third-Party Material

Project code is licensed under GPL-3.0-or-later unless a file says otherwise.

See:

- `LICENSE` for the project license;
- `THIRD_PARTY_NOTICES.md` for root dependency notices;
- `pwa/public/THIRD_PARTY_NOTICES.txt` for notices distributed with the browser artifact;
- `desktop/licenses/` for desktop dependency licenses/notices;
- `desktop/sources/` for corresponding source material included with the desktop distribution;
- `desktop/RUNTIME_DEPENDENCIES.md` for the preserved Java runtime set.

When changing a distributed third-party dependency, treat dependency files, launchers, license/notice material, corresponding source, and package verification as a single release change.
