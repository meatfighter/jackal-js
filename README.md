# jackal-js

`jackal-js` is the browser/PWA port of SlickJackal, the preserved Java recreation of _Jackal_ for the NES. The repository contains both implementations plus the tooling needed to build, verify, package, and release them together:

- a browser/PWA port written in TypeScript;
- the preserved Java desktop version of SlickJackal;
- a static project/about page that ties the web and desktop releases together.

The TypeScript gameplay port deliberately retains much of the structure of the Java source. That is an important design choice, not unfinished cleanup. Keeping the browser implementation close to the original Java implementation makes gameplay behavior easier to compare and reduces the risk of introducing subtle porting differences while modern browser-specific concerns are kept in separate layers.

A new developer should think of the repository as **a preserved game implementation plus a browser adaptation, surrounded by a defensive release system**.

---

## Mental Model

There are three different kinds of code in this repository, and keeping their responsibilities separate makes the project much easier to understand.

### 1. Gameplay/reference code

The original Java game lives under `desktop/src/jackal`. The TypeScript gameplay port lives under `pwa/src/jackal`.

These trees intentionally resemble each other. When changing gameplay behavior, movement, enemies, stage logic, menus, timing, or other game mechanics, compare the TypeScript implementation with the Java implementation before assuming that Java-shaped code should be rewritten into a more idiomatic browser architecture.

The Java tree is useful as a **behavioral reference**. It is not the architectural model for browser-specific concerns such as service workers, deployment-scoped storage, page lifecycle handling, or PWA packaging.

### 2. Browser/PWA integration code

Browser-specific behavior lives primarily under `pwa/src/app` and in the PWA build/public files.

This layer handles concerns that do not exist in the original Java application, including:

- browser startup and the surrounding menu UI;
- canvas/container lifecycle;
- fullscreen and responsive sizing;
- keyboard/gamepad mapping persistence;
- save/continue persistence;
- browser focus and visibility changes;
- audio unlock/suspend/resume behavior;
- resource preloading;
- service-worker registration;
- deployment-relative URLs;
- deployment-scoped local storage.

This is where browser architecture belongs. Avoid pushing these concerns into the Java-shaped gameplay classes unless the game itself genuinely needs to know about them.

### 3. Build/release infrastructure

The root `scripts/` directory is not miscellaneous tooling. It forms a guarded release pipeline responsible for:

- component builds;
- production builds;
- version/build-stamp propagation;
- clean-source provenance;
- source-state immutability checks;
- PWA precache verification;
- desktop packaging and ZIP verification;
- third-party license/source packaging;
- release manifests and hashes;
- nested release-operation locking;
- safe filesystem/path validation;
- atomic `dist/` promotion;
- interrupted-release recovery.

The build system is intentionally stricter than a normal small web project because `dist/` is treated as the canonical deployable release tree. Component builders are not allowed to write directly to it.

### Source-of-truth quick reference

| Concern                      | Source of truth                                                       | Generated/derived output           |
| ---------------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| Gameplay behavior            | `pwa/src/jackal/`, compared with `desktop/src/jackal/`                | bundled PWA JavaScript             |
| Browser lifecycle/UI/storage | `pwa/src/app/`                                                        | bundled PWA JavaScript             |
| Static PWA/offline behavior  | `pwa/public/`, `pwa/vite.config.ts`                                   | `.../pwa/` build output            |
| Public project page          | `about/`                                                              | root of assembled web/full release |
| Desktop Java source          | `desktop/src/`                                                        | `desktop/target/` and desktop ZIP  |
| Desktop runtime contract     | `desktop/RUNTIME_DEPENDENCIES.md`, `desktop/lib/`, `desktop/natives/` | packaged runtime files             |
| Release version source       | `version.json`                                                        | stamped generated artifacts        |
| Production release logic     | `scripts/`                                                            | `.release-work/` then `dist/`      |
| Release integrity/provenance | release scripts + Git state                                           | `dist/release.json`                |

If source and generated output disagree, fix the source and rebuild. Do not patch generated files to make a release appear correct.

---

## Release Deliverables

A full production build assembles three user-facing deliverables into one promoted release tree:

```text
dist/
├── index.html                  # built about/project page
├── styles.css
├── assets/                     # about-page assets, if present
├── pwa/                        # browser game
├── downloads/
│   ├── jackal-desktop.zip      # stable desktop download name
│   └── jackal-desktop-<version>.zip
└── release.json                # release manifest, hashes, provenance
```

The root about page links to:

- the browser game under `pwa/`;
- the stable desktop ZIP;
- the exact source commit associated with the release.

The stable and versioned desktop ZIPs are verified to be byte-for-byte identical during release verification.

---

## Requirements

### Node

Use a Node version accepted by `package.json`:

```text
^20.19.0 || ^22.13.0 || >=24
```

CI uses Node `22.13.0`.

### Java

Use Java 21 LTS for desktop release builds and smoke tests.

The Java sources are compiled as Java 8 bytecode for compatibility, but Java 21 LTS is the primary runtime used when validating current desktop releases.

### Maven

Maven is optional.

`npm run build:desktop` tries, in order:

1. Maven available on the host;
2. WSL2 Maven when running on Windows;
3. a direct `javac`/`jar` fallback.

The fallback exists so a developer with a JDK but no Maven installation can still build the desktop artifact.

### Install JavaScript dependencies

From the repository root:

```sh
npm ci
npm run verify
```

On Windows shells, use `npm.cmd` when `npm` command resolution requires it:

```bat
npm.cmd ci
npm.cmd run verify
```

---

## Repository Layout

The top-level structure is deliberately divided by responsibility.

```text
jackal-js/
├── about/                      # source template for the public project page
├── pwa/                        # TypeScript/browser implementation
├── desktop/                    # preserved Java implementation + desktop packaging
├── scripts/                    # build, verification, release, and safety tooling
├── .github/workflows/          # CI in the full repository
├── version.json                # tracked application version/build-stamp source
├── package.json                # root orchestration commands and JS dependencies
├── package-lock.json           # reproducible JS dependency resolution
├── THIRD_PARTY_NOTICES.md      # root dependency/license notices
├── LICENSE                     # project license
│
├── dist/                       # generated canonical production release
├── .release-components/        # generated noncanonical component output
├── .release-work/              # generated production candidate/recovery workspace
├── .release-candidates/        # generated release metadata/state
├── .release-secrets/           # generated release-only private work area
├── .release-operation.lock*    # generated release-lock state
├── desktop/target/             # generated Java build/package output
└── releases/                   # generated local desktop release staging
```

The generated directories are intentionally ignored by Git.

**Do not treat generated output as source.** If an important behavior appears to exist only under `dist/`, `.release-work/`, `.release-components/`, or `desktop/target/`, find the source script/template that generated it before editing anything.

---

# Source Trees

## `about/` — Public Project Page Source

`about/` contains the source files for the page deployed at the production URL root.

Typical contents include:

```text
about/
├── index.html
├── styles.css
└── assets/
```

`index.html` is a template. `scripts/build-about.mjs` replaces release tokens with values such as:

- application version;
- build stamp;
- versioned PWA URL;
- desktop download URL;
- exact source-code URL for the release commit.

Do not hard-code a release commit or generated download query string into the template. Those values belong to the release process.

---

## `pwa/` — Browser/PWA Port

`pwa/` is a Vite application, but it does **not** have its own independent package installation. Root `package.json` and `node_modules/` provide the JavaScript toolchain and dependencies.

```text
pwa/
├── index.html
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── THIRD_PARTY_NOTICES.txt
│   ├── favicon.ico
│   └── resources/              # game images, data, audio, maps, icons
└── src/
    ├── main.ts
    ├── styles.css
    ├── app/                    # browser/PWA shell
    ├── jackal/                 # Java-shaped gameplay port
    │   └── persistence/        # save-state schema/serialization/storage
    └── java/                   # small Java compatibility helpers
```

### `pwa/src/jackal/`

This is the main TypeScript gameplay port.

The classes intentionally map closely to the Java classes under `desktop/src/jackal`. Examples include:

- `Main.ts`;
- `GameMode.ts`;
- `Player.ts`;
- `Stage.ts`;
- enemy and projectile classes;
- menu/mode classes;
- bosses and stage managers;
- input abstractions.

When gameplay parity matters, compare similarly named Java and TypeScript files side by side.

### `pwa/src/app/`

This directory is the browser integration layer.

Important files include:

- `JackalWebApp.ts` — page/menu/game lifecycle, resource preparation, save/continue integration, responsive sizing, browser lifecycle, audio and UI coordination;
- `DeploymentStorageKeys.ts` — derives storage namespaces from the deployment path;
- `JackalInputMappingStore.ts` — persistent keyboard/gamepad mappings;
- `ResourceManifest.ts` — explicit list of game resources that must be prepared;
- `ServiceWorkerRegistrar.ts` — production registration and development cleanup behavior.

A useful rule is:

> If a concern exists because Jackal is running inside a browser page rather than inside the game world, start by looking in `pwa/src/app`.

### `pwa/src/java/`

This contains small compatibility helpers used to preserve Java-like semantics where doing so makes the port easier to compare with the original source.

The goal is not to recreate the Java runtime. These helpers exist only where preserving Java behavior simplifies the port.

### `pwa/src/jackal/persistence/`

Browser save/continue support is kept separate from normal gameplay classes.

Important pieces include:

- `GameStateSchema.ts` — save-state format/version constants;
- `GameStateSnapshot.ts` — typed snapshot structures;
- `GameElementTypeRegistry.ts` — stable serialized IDs for entity types;
- `JackalGameStateSerializer.ts` — converts live game/mode state to and from snapshots;
- `JackalGameStateStore.ts` — local-storage persistence and validation.

The stable entity registry and schema are intentional. Renaming or reordering runtime classes must not silently reinterpret an older save as a different entity type.

If the save format changes incompatibly, change the schema deliberately and update the related tests rather than relying on incidental class layout.

---

## `desktop/` — Preserved Java Desktop Project

The desktop tree serves two purposes:

1. preserve and build the original Java version;
2. act as a behavioral reference for the TypeScript port.

```text
desktop/
├── src/
│   ├── jackal/                 # preserved Java game source
│   ├── maps/                   # legacy map/data files
│   └── org/newdawn/slick/      # preserved/adapted Slick-related source used by build
├── lib/                        # vendored runtime JARs in the full repo
├── natives/                    # vendored LWJGL/JInput/OpenAL natives in the full repo
├── licenses/                   # third-party license material
├── sources/                    # corresponding third-party source required for distribution
├── pom.xml
├── assembly.xml
├── run-windows.cmd
├── run-windows.ps1
├── run-linux.sh
├── run-macos.sh
├── README.md
└── RUNTIME_DEPENDENCIES.md
```

The review/stripped archives may omit large runtime JARs, natives, and game resources. The full repository must contain the runtime material required by the desktop build.

### Runtime dependencies

The packaged desktop distribution carries the original SlickJackal runtime set:

- Slick2D;
- LWJGL 2;
- JInput;
- JOrbis/Jogg.

The build verifies the required native libraries for the launchers it packages, including 64-bit Windows, Linux, and macOS entries.

The bundled historical `jinput.jar` is also checked for the embedded JUtils plugin class. If a future JInput replacement does not contain it, the build intentionally fails instead of producing a subtly broken controller runtime.

### Desktop compliance material

The generated desktop ZIP includes dependency license/notice files and JOrbis corresponding source material, including:

```text
licenses/SLICK2D.txt
licenses/LWJGL-2.txt
licenses/JINPUT.txt
licenses/LGPL-2.0.txt
licenses/JORBIS-NOTICE.txt
sources/jorbis-0.0.17-sources.jar
```

Keep `desktop/RUNTIME_DEPENDENCIES.md`, the packaging scripts, the release verifier, and the bundled license/source files synchronized when changing desktop dependencies.

### Desktop support policy

The ZIP may contain native files for more operating systems than are publicly advertised.

Only advertise an OS/JVM combination after launching the **generated ZIP** successfully on that exact combination. The current documentation uses Java 21 LTS as the release smoke-test runtime.

---

## `scripts/` — Build and Release System

The scripts are easier to understand when grouped by responsibility.

### Build orchestration

- `build-pwa-release.mjs` — verified component PWA build;
- `build-web-release.mjs` — PWA + about page component build;
- `build-about.mjs` — stamps the public about-page template;
- `build-desktop.mjs` — compiles/packages the Java desktop application;
- `assemble.mjs` — adds desktop downloads to an assembled web/full candidate;
- `build-release.mjs` — canonical full production release pipeline;
- `release-desktop.mjs` — standalone verified desktop release workflow;
- `copy-desktop-release.mjs` — copies an already verified desktop ZIP to local `releases/` staging.

### Verification

- `verify-pwa-precache.mjs` — validates PWA output, resource completeness, relocation behavior, and URL assumptions;
- `verify-desktop-zip.mjs` — validates the packaged desktop ZIP;
- `verify-release-candidate.mjs` — validates the complete assembled release tree;
- `release-manifest.mjs` / `write-release-manifest.mjs` — create and verify file inventories, sizes, and SHA-256 hashes;
- `check-ts-nocheck-budget.mjs` — prevents TypeScript checking coverage from getting worse.

### Release safety

- `build-utils.mjs` — canonical paths, generated-output policies, filesystem/path safety, symlink/junction protection;
- `release-lock-utils.mjs` — release-operation locking and nested/reentrant child-holder tracking;
- `release-atomic-utils.mjs` — journaled candidate promotion and interrupted-promotion recovery;
- `atomic-file-utils.mjs` — temporary-file + rename writes/copies and filesystem sync helpers;
- `source-state-utils.mjs` — clean-checkout checks, source commit/URL capture, tracked-source hashing;
- `version-stamp-utils.mjs` / `stamp-build.mjs` — tracked and temporary build-stamp handling;
- `zip-utils.mjs` — deterministic-enough internal ZIP creation/inspection used by packaging/verifiers;
- `run-utils.mjs` — consistent child-process execution across Windows and Unix-like systems.

### Tests

The `scripts/test-*.mjs` files are Node's built-in test runner tests. They focus heavily on the failure modes that are easy to miss during normal manual play testing:

- deployment-scoped storage keys;
- stable game-state schema/entity identifiers;
- input mapping persistence;
- volume persistence;
- service-worker cache scoping/versioning;
- development service-worker cleanup boundaries;
- version/build-stamp propagation;
- release path safety;
- release lock contention/stale recovery/reentrant children;
- source provenance;
- atomic-promotion crash recovery;
- release verification contracts.

When modifying release infrastructure, tests should normally be added at the same time. Much of the release system exists specifically because a happy-path build does not exercise crash windows, races, dirty-source conditions, or path attacks.

---

# Daily Development Workflow

## Start the browser game

```sh
npm run dev
```

This starts the Vite development server on the loopback interface.

In development, Jackal deliberately does not behave exactly like an installed production service worker. `ServiceWorkerRegistrar.ts` removes only service-worker registrations belonging to the current application scope so stale local workers do not interfere with normal development while unrelated deployments remain untouched.

## Run checks

Useful individual checks:

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run check:ts-nocheck
```

The normal source gate is:

```sh
npm run verify
```

`verify` runs:

1. Node tests;
2. Prettier check;
3. ESLint;
4. TypeScript type checking;
5. the `@ts-nocheck` budget check.

Use `npm run verify` before considering a change ready for a release build.

## Format source

```sh
npm run format
```

Do not hand-format generated output. Format the source that produces it.

---

# Browser/PWA Architecture

## Slick2D compatibility layer

The PWA uses `slick2d-ts`, a TypeScript/browser adaptation of the Slick2D APIs used by the original Java game.

The dependency is pinned to an exact Git commit in `package.json` rather than floating on a semver range. This is deliberate because rendering, timing, audio, and input behavior are gameplay-sensitive. Upgrade it as an intentional dependency change and retest the games that use it.

## Game timing

The TypeScript port retains the original fixed-step gameplay model rather than tying game simulation speed directly to browser rendering frequency.

The browser/container layer must therefore preserve the distinction between:

- rendering cadence;
- gameplay update cadence;
- browser suspension/visibility changes.

When a tab is hidden or execution is suspended, timing state must be reset appropriately on resume rather than attempting to process a huge backlog of missed game updates.

Avoid changing timing code casually. Small differences can alter movement, collision timing, enemy behavior, or input responsiveness even when the game appears visually correct.

## Resource loading

`pwa/src/app/ResourceManifest.ts` is the explicit application-level resource inventory used by startup/preload logic.

Vite's build step separately constructs the service worker's static precache list from the generated output tree. These are related but distinct concepts:

- the **resource manifest** tells the game what resources it needs to prepare;
- the **service-worker precache list** tells the offline layer what generated files belong to the immutable release cache.

If a resource is added, moved, or renamed, verify both application loading and the final PWA precache.

---

# Deployment-Relative PWA Design

The PWA is intentionally relocatable. It should not assume that it always lives at one hard-coded pathname.

The same built app may be served from paths such as:

```text
/pwa/
/jackal-staging/pwa/
/some/preview/path/pwa/
```

This requirement affects several parts of the implementation.

## Vite base URL

Production Vite builds use a relative base (`./`). Static generated URLs therefore remain relative to the installed PWA root.

## Service-worker scope

`pwa/public/sw.js` derives application URLs from `self.registration.scope` rather than assuming `/pwa/` or another fixed path.

Its cache name includes:

- application version;
- build stamp;
- encoded deployment scope.

Conceptually:

```text
jackal | <deployment-scope> | <version>-<build-stamp>
```

This prevents two side-by-side Jackal installations from treating each other's cache as their own.

## Local-storage scope

`DeploymentStorageKeys.ts` namespaces persistent values by the deployment directory path.

For example, separate deployments should have separate buckets for:

- save games;
- input mappings;
- volume/settings state.

Query strings are intentionally ignored when identifying the deployment so a cache-busting URL such as `?v=<stamp>` does not create a new logical save-game namespace.

## Development cleanup

Development service-worker cleanup is scope-aware. It must not unregister arbitrary service workers belonging to unrelated localhost apps or adjacent Jackal deployments.

## Precache verification

`scripts/verify-pwa-precache.mjs` exercises built PWA output under multiple hypothetical deployment roots and rejects hard-coded runtime paths or missing resources.

If you touch any of the following, run the full verification suite:

- `pwa/public/sw.js`;
- `pwa/vite.config.ts`;
- deployment storage;
- resource URL generation;
- service-worker registration;
- static resource layout.

---

# Save/Continue And Persistent State

The browser port can persist enough runtime state to continue a game across page sessions. That is more involved than serializing a few high-level fields because the live game contains entities, references between objects, modes, input state, random state, audio state, and special-mode state.

The persistence layer therefore uses an explicit snapshot format instead of attempting to stringify arbitrary runtime objects.

Key concepts:

- **schema version** — identifies the serialized state format;
- **application version** — records the app version associated with the snapshot;
- **stable entity type IDs** — prevent class ordering/renaming from silently changing meaning;
- **encoded references** — represent relationships such as player/game/main/entity references;
- **mode-specific snapshots** — preserve state outside ordinary `GameMode` gameplay;
- **validation on restore** — malformed or obsolete saves can be cleared deliberately, while future-version saves and transient restore/read failures are preserved.

Tests enforce that the schema constants have a single source and that serialized entity identifiers remain stable.

When changing persistent state:

1. decide whether the change is backward-compatible;
2. update the snapshot/serializer deliberately;
3. update schema/entity tests;
4. test new game and continue paths;
5. test saves created in more than one game/mode state.

---

# Versioning And Build Stamps

`version.json` is the tracked version source:

```json
{
    "version": "1.0.0",
    "buildStamp": "..."
}
```

The two fields serve different purposes.

## Version

`version` is the human/application release version.

It appears in generated release metadata and versioned desktop download filenames.

## Build stamp

`buildStamp` is used to make browser caches and release resources uniquely identifiable.

A new production build needs a fresh effective build stamp even if the semantic version did not change.

## Why production builds do not edit `version.json`

A release should not make the source tree dirty merely because the build system needed a new cache stamp.

Therefore:

- `npm run stamp` intentionally modifies the tracked build stamp in `version.json`;
- production/component release commands normally generate a temporary effective stamp in memory;
- child build tools receive the effective version through `JACKAL_BUILD_VERSION_JSON`;
- Vite and the service worker receive the generated value without rewriting tracked source.

This is an important reproducibility property: **building the release should not itself mutate source files**.

Generated stamp state under `.release-candidates/` exists to coordinate unique release stamps without turning that state into source code.

---

# Build Workflows

There are intentionally different build commands for development, component output, desktop output, and the canonical production release.

## Component PWA build

```sh
npm run build:pwa
```

This builds a verified PWA component into generated release-component storage. It is useful when working on the browser deliverable in isolation.

It does **not** create the canonical production `dist/` tree.

## Component web build

```sh
npm run build:web
```

This runs `verify`, then builds:

```text
.release-components/web/
├── index.html
├── styles.css
└── pwa/
```

This is useful for reviewing the about page and PWA together without performing a full desktop build/promotion.

Again, `.release-components/` is not canonical deployment output.

## Desktop build

```sh
npm run build:desktop
```

Expected generated outputs include:

```text
desktop/target/
├── jackal-desktop.jar
├── jackal-desktop.zip
├── classes/
└── distribution/
    └── jackal-desktop/
```

Use:

```sh
npm run verify:desktop
```

to validate the generated ZIP.

## Standalone desktop release

```sh
npm run release:desktop
```

This is not just a copy command. It performs:

```text
verify source
    ↓
build desktop
    ↓
verify desktop ZIP
    ↓
copy verified ZIP to releases/
```

The copy step verifies the desktop ZIP again before accepting it into local release staging.

## Full production release

```sh
npm run build
```

This is the canonical production workflow.

Do not replace it with a series of ad-hoc manual copies into `dist/`.

---

# Full Production Release Pipeline

`npm run build` first runs the normal source verification gate and then executes `scripts/build-release.mjs`.

At a high level:

```text
source verification
       ↓
recover interrupted old promotion
       ↓
validate/capture source provenance
       ↓
snapshot tracked source hashes
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
atomically promote candidate → dist
```

In more detail, the release process:

1. acquires the release-operation lock;
2. recovers an interrupted previous promotion if a journal is present;
3. requires clean Git state by default and captures source provenance;
4. records the exact tracked source file set and SHA-256 hashes;
5. cleans `.release-work/`;
6. generates an effective build stamp without modifying tracked `version.json`;
7. builds the PWA into `.release-work/candidate/pwa`;
8. verifies PWA resource completeness and relocatability;
9. builds the about page with versioned links and exact source URL;
10. builds the desktop JAR/ZIP;
11. verifies/copies desktop downloads into the candidate;
12. writes `release.json`;
13. verifies the complete release candidate;
14. confirms tracked source has not changed during the build;
15. promotes the verified candidate to `dist/` using journaled atomic filesystem operations.

Only after those steps is `dist/` considered the new release.

---

# Clean Checkout And Source Provenance

Production releases require a clean Git working tree by default.

The release checks:

- unstaged tracked changes;
- staged changes;
- non-ignored untracked files.

A dirty checkout causes `npm run build` to fail before a production candidate is accepted.

This matters because a release manifest that names commit `abc123` is only reproducible if the files used to build it actually match that commit.

## Dirty-release override

For deliberate local validation of uncommitted work:

```sh
JACKAL_ALLOW_DIRTY_RELEASE=1 npm run build
```

PowerShell:

```powershell
$env:JACKAL_ALLOW_DIRTY_RELEASE = "1"
npm.cmd run build
```

The override is deliberately explicit. The generated manifest records:

```json
"dirty": true
```

Do not use the dirty override for a normal public production release.

## Source provenance in the release

A clean production release records:

- `sourceCommit` — exact Git commit SHA;
- `sourceUrl` — URL to that exact commit;
- `dirty` only when a dirty build was explicitly permitted.

The built about page uses the same source URL for its Source Code link.

## Source cannot change mid-build

A clean checkout at the beginning is not enough for a long build. A developer or process might edit a tracked file after the candidate has started building.

To prevent promoting a candidate assembled from inconsistent source states, the release process hashes all tracked files before building and verifies the tracked file set and hashes again immediately before promotion.

If the source changed, promotion stops.

---

# Release Manifest

Every full release contains `release.json`.

Conceptually it looks like:

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

The manifest is not merely informational. The verifier treats it as an integrity inventory.

Verification checks that:

- every manifest entry exists;
- byte sizes match;
- SHA-256 hashes match;
- no generated files are missing from the manifest;
- no unexpected generated files exist outside the manifest;
- required provenance exists for production output;
- the desktop stable/versioned ZIPs are identical;
- the desktop ZIP contains its required launchers, runtime JARs, native files, notices, licenses, and corresponding source material.

Run:

```sh
npm run verify:release
```

to validate promoted `dist/`.

When debugging a candidate directly, `scripts/verify-release-candidate.mjs` can also be given the candidate directory explicitly.

---

# Atomic Promotion And Crash Recovery

A production candidate is built and fully verified away from `dist/`. Promotion happens only after verification succeeds.

The promotion code uses a journal because a sequence of filesystem renames can still be interrupted if Node or the machine dies between operations.

Conceptually:

```text
journal = prepared
       ↓
existing dist → backup
       ↓
journal = target-backed-up
       ↓
candidate → dist
       ↓
journal = candidate-promoted
       ↓
remove old backup
       ↓
remove journal
```

The journal allows the next release attempt to inspect the actual filesystem state and recover conservatively.

Important invariant:

> Recovery should leave either the previous complete release or the new complete release at `dist/`; it should not delete the last usable release because a process died in a narrow promotion window.

Tests exercise crash cut points, including the dangerous state where the old `dist/` has already moved to a backup but the journal still says `prepared`.

Do not simplify this code to `rm -rf dist && mv candidate dist`. That would remove the crash-consistency guarantees the current release process was built to provide.

---

# Release Operation Lock

Release-related commands can invoke other release-related commands. Without coordination, two builds or nested build scripts could clean or promote the same generated paths concurrently.

`scripts/release-lock-utils.mjs` provides a reentrant filesystem lock.

## Why it is reentrant

The full release script may hold the release lock and spawn another repository script that also calls `withReleaseOperationLock`. That child must be allowed to participate in the existing release operation rather than deadlock against its parent.

The lock token/path are propagated through:

```text
JACKAL_RELEASE_OPERATION_LOCK_PATH
JACKAL_RELEASE_OPERATION_LOCK_TOKEN
```

Nested processes register holder metadata under the same lock.

## Owner versus holders

The lock tracks:

- the original owner;
- nested/reentrant child holder processes.

If the parent finishes its protected scope while a registered child is still running, the owner can be marked released without destroying the lock. The lock remains protected until the child holder exits.

## Stale-lock recovery

A killed release process can leave lock metadata behind.

Stale recovery therefore checks process liveness and metadata before taking ownership.

The implementation deliberately avoids recursively deleting the canonical lock pathname while another process might publish a replacement. Old lock instances are detached by atomic rename to unique stale/released paths before recursive cleanup.

A separate recovery guard prevents multiple stale-lock recoverers from racing each other.

These details are subtle. If changing the lock protocol, run the concurrency tests repeatedly rather than trusting a single successful execution.

---

# Atomic File Writes

Several release metadata files are written using a temporary file followed by rename rather than being overwritten in place.

This pattern is centralized in `scripts/atomic-file-utils.mjs`.

The intent is to reduce the chance that a crash leaves half-written JSON or another partially updated release control file.

Use the shared helper when adding new release-control metadata instead of implementing a new ad-hoc temporary-file scheme.

---

# Path And Filesystem Safety

The release system intentionally validates more than string path prefixes.

`scripts/build-utils.mjs` distinguishes among:

- source directories;
- local generated directories such as `desktop/target`;
- component output;
- full release work areas;
- release candidate/state areas;
- canonical production `dist/`.

Checks are designed to prevent mistakes such as:

- a component build writing directly into `dist/`;
- a cleanup target pointing at the repository root;
- output escaping its allowed root;
- symlink/junction tricks redirecting output into source;
- a generated path overlapping protected tracked source;
- arbitrary user-supplied paths being treated as trusted release destinations.

The desktop target is a special case: it intentionally lives underneath the tracked `desktop/` tree, so it is validated as a specifically approved local generated root rather than as a general release-output directory.

When adding a new generated directory, decide which path policy it belongs to rather than weakening an existing validator until the new path passes.

---

# Generated Directory Lifecycle

Understanding the generated directories helps when debugging failed builds.

## `.release-components/`

Noncanonical outputs from component workflows.

Examples:

```text
.release-components/pwa/
.release-components/web/
```

Safe to regenerate. Do not deploy it by assuming it is equivalent to a full verified release.

## `.release-work/`

Temporary full-release workspace.

Contains the production candidate, promotion journal, and temporary backup state used during release promotion/recovery.

It is generated and normally cleaned by the release process, but journal recovery may need to inspect it before cleanup.

## `.release-candidates/`

Persistent generated release coordination state such as build-stamp state.

It is not source and should not be committed.

## `.release-secrets/`

Reserved generated/private release work area. It is kept separate so secrets or sensitive transient material are not confused with source or deployable output.

## `.release-operation.lock*`

Release lock, pending lock, recovery guard, and detached stale/released lock directories.

Normally these are managed entirely by release tooling.

## `desktop/target/`

Java compile/package output.

Delete/regenerate it rather than editing its contents.

## `releases/`

Local staging area for verified standalone desktop ZIPs produced by `release:desktop`.

Generated ZIP/log/tmp files are ignored.

## `dist/`

The canonical promoted production release tree.

Treat it as generated deployment output. Do not make source changes directly inside it.

---

# PWA Service Worker Strategy

The service worker is deliberately small and predictable.

## Installation

Generated build output replaces the static placeholder list with the complete precache inventory.

The worker opens a cache identified by deployment scope, app version, and build stamp and precaches the generated resources.

## Activation

Only older Jackal caches belonging to the **current deployment scope** are removed.

The worker must not delete caches from a side-by-side deployment simply because they share a product name.

## Navigation requests

Navigation uses a network-first strategy with cached `index.html`/app-root fallback for offline use.

## Static/runtime GET requests

Static resource requests use cache-first behavior for resources already present in the immutable build cache. A network fetch on a miss is returned but does not silently mutate the immutable precache into an uncontrolled runtime cache.

## No forced mid-session worker takeover

The application does not aggressively force a newly installed service worker to replace the currently controlling worker in the middle of a running game.

This avoids turning a normal deployment into an unexpected mid-game resource-version transition.

---

# TypeScript Strategy And `@ts-nocheck`

Much of the gameplay port was mechanically/structurally adapted from Java and still contains `@ts-nocheck`.

That is known technical debt, but removing all of it in one release would create a large, gameplay-sensitive refactoring with limited immediate user benefit.

Instead the repository uses a ratchet:

```sh
npm run check:ts-nocheck
```

The current budget prevents the number of unchecked TypeScript gameplay files from increasing.

The intended long-term direction is to reduce the budget gradually as files are safely typed and tested.

When removing `@ts-nocheck` from gameplay code:

- preserve Java parity unless intentionally fixing behavior;
- avoid bundling unrelated gameplay rewrites into the typing cleanup;
- run `verify`;
- smoke-test the affected mechanics.

Eventually an exact filename allowlist may be preferable to a numeric budget because it can prevent one newly unchecked file from being hidden by a different file becoming checked.

---

# Dependency Policy

Root `package-lock.json` is part of the reproducible JavaScript build and should be committed with dependency changes.

`slick2d-ts` is pinned to an exact Git commit. Do not regenerate the dependency as a floating compatible version without understanding that this can change timing/input/rendering behavior.

When upgrading build dependencies such as Vite, TypeScript, ESLint, or Prettier:

1. update the lockfile;
2. run `npm run verify`;
3. run the PWA build/precache verifier;
4. run a full production build when release behavior could be affected.

When upgrading `slick2d-ts`, also perform gameplay/input/timing smoke tests.

---

# CI

The full repository's GitHub Actions workflow runs the same high-level gates used by developers rather than maintaining a second release implementation in YAML.

The workflow runs approximately:

```sh
npm ci
npm run verify
npm run build
```

with Node `22.13.0` and Temurin Java 21.

That means CI exercises not only TypeScript lint/type/tests but also the real release orchestration, including candidate assembly, desktop packaging, manifest verification, provenance checks, and promotion code.

If a future CI optimization skips the full build on some branches, keep at least one protected branch/tag workflow that runs the canonical production pipeline exactly as it will be used for release.

---

# Testing Philosophy

This repository has two kinds of confidence checks.

## Automated structural/process tests

These are especially strong around build and PWA infrastructure because those areas contain failure modes that are hard to reproduce manually:

- crash windows;
- race conditions;
- stale locks;
- side-by-side deployment interference;
- hard-coded paths;
- malformed save metadata;
- stale service-worker cache behavior;
- dirty source provenance;
- missing license/runtime files.

## Gameplay smoke/parity testing

The Java-shaped TypeScript port still benefits from manual gameplay testing and direct Java/TypeScript comparison because most gameplay files are not yet deeply unit-tested.

For gameplay changes, test the specific mechanic plus adjacent systems. Timing/input changes deserve broader testing than a local visual change.

---

# Common Change Workflows

## Changing gameplay

1. Start in `pwa/src/jackal`.
2. Find the corresponding Java class in `desktop/src/jackal`.
3. Determine whether the desired change is a parity fix, an intentional browser divergence, or a new shared behavior.
4. Keep browser-only concerns outside the Java-shaped gameplay layer when possible.
5. Run `npm run verify`.
6. Play-test the affected mechanic.

## Changing save/continue

1. Review `pwa/src/jackal/persistence`.
2. Decide whether the snapshot format remains backward-compatible.
3. Preserve stable entity IDs.
4. Update schema/serializer tests.
5. Test saves from multiple game/mode states.

## Adding or moving PWA resources

1. Update the actual resource files under `pwa/public/resources`.
2. Update `ResourceManifest.ts` when the game must preload the resource.
3. Build the PWA.
4. Run `npm run verify:pwa-precache` against generated output.
5. Test from a non-root deployment path if URL generation changed.

## Changing service-worker behavior

1. Update `pwa/public/sw.js` and/or registration code.
2. Consider side-by-side deployments explicitly.
3. Consider both online navigation and offline fallback.
4. Consider upgrade behavior with an already-running game.
5. Run the service-worker tests and full `verify`.
6. Test install, reload, offline reload, and deployment upgrade manually.

## Changing desktop dependencies

Update together:

- `desktop/lib` and/or `desktop/natives`;
- launcher/runtime classpath assumptions;
- `desktop/RUNTIME_DEPENDENCIES.md`;
- required license/notices;
- required corresponding source where applicable;
- `build-desktop.mjs` dependency checks;
- desktop ZIP verifier requirements.

Then build and launch the **generated ZIP** on every platform/JVM you intend to advertise.

## Changing release infrastructure

1. Identify the generated path policy involved.
2. Preserve the rule that only the canonical full release promotes to `dist/`.
3. Add tests for failure states, not just happy paths.
4. For lock/promotion changes, think in terms of process death between every filesystem operation.
5. Run `npm run verify` repeatedly when concurrency behavior changed.
6. Run a complete production build from a clean checkout.

---

# Useful Commands

| Command                       | Purpose                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                 | Start local PWA development server                                      |
| `npm test`                    | Run Node test suite                                                     |
| `npm run format`              | Apply Prettier                                                          |
| `npm run format:check`        | Check formatting                                                        |
| `npm run lint`                | Run ESLint                                                              |
| `npm run typecheck`           | Run TypeScript compiler without emitting                                |
| `npm run check:ts-nocheck`    | Enforce unchecked-file budget                                           |
| `npm run verify`              | Run the normal source-quality gate                                      |
| `npm run build:pwa`           | Build/verify PWA component output                                       |
| `npm run build:web`           | Build verified web component output under `.release-components`         |
| `npm run build:about`         | Build the about-page component template                                 |
| `npm run build:desktop`       | Build desktop JAR/ZIP under `desktop/target`                            |
| `npm run verify:desktop`      | Validate `desktop/target/jackal-desktop.zip`                            |
| `npm run release:desktop`     | Verify/build/verify and stage standalone desktop ZIP                    |
| `npm run run:desktop`         | Run desktop Java build                                                  |
| `npm run build`               | Build, verify, and atomically promote full production release to `dist` |
| `npm run verify:release`      | Verify promoted `dist` manifest and artifacts                           |
| `npm run verify:pwa-precache` | Verify built PWA precache/relocation rules                              |
| `npm run preview:pwa`         | Preview PWA build configuration                                         |
| `npm run preview:dist`        | Serve promoted `dist` output locally                                    |
| `npm run stamp`               | Intentionally update tracked `version.json` build stamp                 |

---

# Where Do I Make This Change?

| Goal                                 | Start here                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Player/enemy/game mechanics          | `pwa/src/jackal/`, compare `desktop/src/jackal/`                             |
| Browser menu/game shell              | `pwa/src/app/JackalWebApp.ts`                                                |
| Keyboard/gamepad mapping persistence | `pwa/src/app/JackalInputMappingStore.ts`                                     |
| Save/continue serialization          | `pwa/src/jackal/persistence/`                                                |
| Deployment-specific local storage    | `pwa/src/app/DeploymentStorageKeys.ts`                                       |
| Service-worker registration          | `pwa/src/app/ServiceWorkerRegistrar.ts`                                      |
| Offline/cache strategy               | `pwa/public/sw.js`                                                           |
| PWA build token/precache generation  | `pwa/vite.config.ts`                                                         |
| Game preload resource inventory      | `pwa/src/app/ResourceManifest.ts`                                            |
| Public project/about page            | `about/` and `scripts/build-about.mjs`                                       |
| Desktop Java behavior                | `desktop/src/jackal/`                                                        |
| Desktop runtime dependencies         | `desktop/RUNTIME_DEPENDENCIES.md`, `desktop/lib/`, `desktop/natives/`        |
| Desktop packaging                    | `scripts/build-desktop.mjs`, `scripts/verify-desktop-zip.mjs`                |
| Full release orchestration           | `scripts/build-release.mjs`                                                  |
| Release manifest                     | `scripts/release-manifest.mjs`, `scripts/write-release-manifest.mjs`         |
| Source provenance                    | `scripts/source-state-utils.mjs`                                             |
| Release locking                      | `scripts/release-lock-utils.mjs`                                             |
| Atomic promotion/recovery            | `scripts/release-atomic-utils.mjs`                                           |
| Output/path safety                   | `scripts/build-utils.mjs`                                                    |
| Version/build stamps                 | `version.json`, `scripts/version-stamp-utils.mjs`, `scripts/stamp-build.mjs` |
| Third-party notices                  | root/PWA notices plus `desktop/licenses/` and `desktop/sources/`             |

---

# Release Checklist

For a public release, use the full unstripped repository and start from a clean, committed checkout whose commit has been pushed to the public source repository.

```sh
npm ci
npm run verify
npm run build
npm run verify:release
npm run verify:pwa-precache
```

Do **not** set `JACKAL_ALLOW_DIRTY_RELEASE` for a normal public release.

Then perform artifact-level smoke tests.

## PWA smoke test

Test the generated `dist/pwa` rather than the development server:

- new game;
- continue/save;
- keyboard input;
- physical gamepad input and mapping;
- fullscreen enter/exit;
- volume/mute persistence;
- tab hide/focus/resume;
- refresh while online;
- offline reload after installation;
- service-worker update from an older deployed build;
- a side-by-side/non-root deployment path if deployment logic changed.

## Desktop smoke test

Extract and launch the actual generated ZIP rather than running loose classes from the development tree.

Test each OS/JVM combination you intend to advertise, including:

- application startup;
- keyboard controls;
- physical controller detection/input;
- audio;
- game launch and stage play;
- launcher scripts/native discovery.

## Provenance check

Inspect `dist/release.json` and confirm:

- `sourceCommit` is the intended release commit;
- `sourceUrl` opens that exact pushed commit;
- `dirty` is absent for a normal clean production release;
- the About page Source Code link points at the same commit.

Deploy the generated `dist/` only after these checks pass.

---

# Troubleshooting

## `build:desktop` reports a missing runtime JAR or native library

The stripped review archives intentionally omit some large runtime files. In the full repository, check `desktop/RUNTIME_DEPENDENCIES.md` and make sure the expected `desktop/lib` and `desktop/natives` contents are present.

Do not weaken the verifier merely to make a package build without a required runtime file.

## Production build says the checkout is dirty

Run:

```sh
git status
```

Commit, stash, ignore, or remove the unexpected files.

Use `JACKAL_ALLOW_DIRTY_RELEASE=1` only for deliberate local validation, not routine production releases.

## A release operation lock remains after a killed build

Run the normal release command again first. The lock system contains stale-process recovery logic.

Do not blindly delete lock state while another release command might still be running.

## A promotion journal exists

Run the normal full release path. `build-release.mjs` calls interrupted-promotion recovery before cleaning the release workspace.

Avoid manually deleting the journal/backup/candidate until you understand which release tree is currently complete.

## PWA works at one URL but not a staging/subdirectory URL

Look for accidentally hard-coded paths in:

- service-worker code;
- resource URLs;
- generated manifest/index files;
- browser storage assumptions.

Run `npm run verify:pwa-precache`, which intentionally tests multiple deployment roots.

## Save/continue suddenly disappears after a URL change

Persistent state is namespaced by deployment directory. Moving the app to a different path intentionally gives it a different storage namespace.

Query-string changes alone should not create a new namespace.

---

# Design Principles Behind The Repository

Several recent pieces of release infrastructure can look excessive when viewed individually. Together they enforce a small set of useful rules:

1. **Preserve behavioral parity where it matters.** The TypeScript gameplay tree remains comparable with Java.
2. **Keep browser concerns outside the gameplay port.** PWA lifecycle, storage, caching, and page UI belong in the browser layer.
3. **Treat generated artifacts as disposable until verified.** Build into candidates/components, not directly into production.
4. **Only one canonical path may replace `dist/`.** Component builders must never accidentally become deployers.
5. **A production artifact should identify the exact source that produced it.** Clean checkout + commit provenance + final source hash check provide that chain.
6. **A crash during release should not destroy the previous good release.** Journaled promotion and recovery preserve a usable `dist/`.
7. **Parallel/nested release scripts must not race each other.** The release lock coordinates owners and child holders.
8. **Side-by-side PWA deployments must not interfere with each other.** Cache and storage identity includes deployment scope/path.
9. **Release verification should inspect the artifact, not merely trust the build command.** Manifests, ZIP contents, hashes, licenses, and natives are checked after generation.
10. **Known technical debt should move in one direction.** The TypeScript `@ts-nocheck` budget is a ratchet rather than a reason for risky mass refactoring.

If a proposed shortcut violates one of these rules, understand why the guardrail exists before removing it.

---

# License And Third-Party Material

Project code is licensed under GPL-3.0-or-later unless a file says otherwise.

See:

- `LICENSE` for the project license;
- `THIRD_PARTY_NOTICES.md` for root dependency notices;
- `pwa/public/THIRD_PARTY_NOTICES.txt` for notices distributed with the browser artifact;
- `desktop/licenses/` for desktop dependency licenses/notices;
- `desktop/sources/` for bundled corresponding source material required by distributed dependencies;
- `desktop/RUNTIME_DEPENDENCIES.md` for details about the preserved Java runtime set.

When changing a distributed third-party dependency, treat license/source packaging as part of the dependency change, not as a later release-documentation task.
